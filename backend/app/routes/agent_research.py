import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.agents.research_agent import create_research_agent

router = APIRouter(tags=["Agentic Research"])
logger = logging.getLogger(__name__)


class AgentResearchRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    knowledge_base_id: int = Field(gt=0)


class AgentResearchResponse(BaseModel):
    answer: str
    tool_calls: list[dict[str, Any]]
    tools_used: list[str]
    sources: list[dict[str, Any]]


def is_quota_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        indicator in message
        for indicator in (
            "resource_exhausted",
            "quota exceeded",
            "rate limit exceeded",
            "too many requests",
        )
    )


def parse_tool_content(content: Any) -> Any:
    if isinstance(content, (dict, list)):
        return content

    if not isinstance(content, str):
        return None

    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return None


def extract_sources(tool_result: Any) -> list[dict[str, Any]]:
    parsed = parse_tool_content(tool_result)

    if isinstance(parsed, list):
        candidates = parsed
    elif isinstance(parsed, dict):
        candidates = parsed.get("sources", [])

        if not candidates and isinstance(parsed.get("documents"), list):
            candidates = [
                source
                for document in parsed["documents"]
                if isinstance(document, dict)
                for source in document.get("sources", [])
            ]
    else:
        return []

    if not isinstance(candidates, list):
        return []

    sources = []

    for source in candidates:
        if not isinstance(source, dict):
            continue

        filename = source.get("filename") or source.get("source")
        excerpt = source.get("excerpt")

        if not filename and not excerpt:
            continue

        page = source.get("page")

        if page is not None:
            try:
                page = int(page)
            except (TypeError, ValueError):
                page = None

        sources.append(
            {
                "document_id": source.get("document_id"),
                "filename": filename or "Unknown document",
                "page": page,
                "excerpt": excerpt or "",
            }
        )

    return sources


def deduplicate_sources(
    sources: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    unique_sources = []
    seen = set()

    for source in sources:
        key = (
            source.get("document_id"),
            source.get("filename"),
            source.get("page"),
            source.get("excerpt"),
        )

        if key in seen:
            continue

        seen.add(key)
        unique_sources.append(
            {
                "citation_index": len(unique_sources) + 1,
                **source,
            }
        )

    return unique_sources


def extract_answer(messages: list[Any]) -> str:
    for message in reversed(messages):
        if getattr(message, "type", "") != "ai":
            continue

        content = getattr(message, "content", "")

        if isinstance(content, str) and content.strip():
            return content

        if isinstance(content, list):
            text_parts = [
                item["text"]
                for item in content
                if isinstance(item, dict)
                and item.get("type") == "text"
                and isinstance(item.get("text"), str)
            ]

            if text_parts:
                return "\n".join(text_parts)

    return ""


@router.post(
    "/agent-research",
    response_model=AgentResearchResponse,
    responses={
        429: {"description": "Gemini API quota or rate limit exceeded"},
        500: {"description": "Internal agent research error"},
    },
)
def agent_research(
    request: AgentResearchRequest,
    http_request: Request,
):
    try:
        rag_service = http_request.app.state.rag_service
        agent = create_research_agent(rag_service)

        result = agent.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            f"Answer this question using knowledge base "
                            f"{request.knowledge_base_id}: "
                            f"{request.question}\n\n"
                            "Use the specified knowledge base for all "
                            "knowledge-base searches. Use tools only when "
                            "appropriate. Base factual claims on retrieved "
                            "evidence. State when evidence is insufficient. "
                            "Never invent sources or page numbers."
                        ),
                    }
                ]
            },
            config={"recursion_limit": 12},
        )

        messages = result.get("messages", [])
        tool_calls = []
        tools_used = []
        collected_sources = []

        for message in messages:
            for call in getattr(message, "tool_calls", []):
                tool_name = call.get("name", "unknown")
                tools_used.append(tool_name)
                tool_calls.append(
                    {
                        "name": tool_name,
                        "args": call.get("args", {}),
                    }
                )

            if getattr(message, "type", "") == "tool":
                collected_sources.extend(
                    extract_sources(getattr(message, "content", ""))
                )

        answer = extract_answer(messages)

        if not answer:
            raise ValueError("The research agent returned no final answer.")

        return AgentResearchResponse(
            answer=answer,
            tool_calls=tool_calls,
            tools_used=list(dict.fromkeys(tools_used)),
            sources=deduplicate_sources(collected_sources),
        )

    except Exception as exc:
        logger.error(
            "Agent research failed: %s",
            type(exc).__name__,
            exc_info=True,
        )

        if isinstance(exc, HTTPException):
            raise

        if is_quota_error(exc):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota or rate limit exceeded. "
                    "Check your API usage before retrying."
                ),
            ) from exc

        raise HTTPException(
            status_code=500,
            detail="Agent research failed due to an internal error.",
        ) from exc