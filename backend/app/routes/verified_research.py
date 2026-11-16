from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.agents.tools import create_verified_research_tool


router = APIRouter(tags=["Verified Research"])


class VerifiedResearchRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    knowledge_base_id: int = Field(gt=0)


class ResearchSource(BaseModel):
    citation_index: int
    document_id: str | None = None
    filename: str
    page: int | None = None
    excerpt: str


class VerifiedResearchResponse(BaseModel):
    answer: str
    sources: list[ResearchSource]
    retrieval_mode: str
    verification_verdict: str
    grounded: bool
    citations_valid: bool
    unsupported_claims: list[str]
    verification_explanation: str


@router.post(
    "/verified-research",
    response_model=VerifiedResearchResponse,
)
def verified_research(
    request: VerifiedResearchRequest,
    http_request: Request,
):
    try:
        rag_service = http_request.app.state.rag_service
        research_tool = create_verified_research_tool(rag_service)

        result = research_tool.invoke({
            "question": request.question,
            "knowledge_base_id": request.knowledge_base_id,
        })

        return VerifiedResearchResponse(**result)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Verified research failed: {str(exc)}",
        ) from exc