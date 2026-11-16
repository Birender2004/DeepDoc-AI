
from app.rag.rag_service import RAGService
from app.agents.tools import create_verified_research_tool


def main():
    rag_service = RAGService()
    rag_service.initialize()
    rag_service.initialize_llm()

    verified_research = create_verified_research_tool(rag_service)

    result = verified_research.invoke({
        "question": (
            "What are the main findings or conclusions supported "
            "by this research document? Cite the evidence and pages."
        ),
        "knowledge_base_id": 2,
    })

    print("\n===== VERIFIED RESEARCH RESULT =====")
    print(result)


if __name__ == "__main__":
    main()
