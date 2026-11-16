from langchain.agents import create_agent

from app.agents.tools import (
    create_compare_documents_tool,
    create_search_document_tool,
    create_search_knowledge_base_tool,
    create_verified_research_tool,
)


def create_research_agent(rag_service):
    tools = [
        create_search_knowledge_base_tool(rag_service),
        create_search_document_tool(rag_service),
        create_compare_documents_tool(rag_service),
        create_verified_research_tool(rag_service),
    ]

    return create_agent(
        model=rag_service.llm,
        tools=tools,
        system_prompt=(
            "You are DeepDoc AI, a document research assistant. "
            "Use search_knowledge_base to search across a knowledge base. "
            "Use search_document for a specific document UUID. "
            "Use compare_documents when comparing two documents. "
            "Use verified_research for questions requiring a cited answer "
            "with grounding and citation verification. "
            "Never invent document IDs, evidence, sources, or page numbers. "
            "Base factual claims on retrieved evidence. "
            "Clearly state when evidence is insufficient. "
            "Do not claim a tool succeeded unless it returned results. "
            "Use the minimum number of tool calls necessary. "
            "Once you have sufficient evidence, stop calling tools and "
            "provide the final answer. "
            "Do not repeat the same tool call with identical arguments "
            "unless a previous call failed or returned insufficient results."
        ),
    )
