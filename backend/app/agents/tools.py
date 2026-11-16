import json

from langchain_core.tools import tool

from app.rag.verified_rag import create_verified_rag
from app.retrieval.multi_query import create_query_generator


def document_to_source(document, index):
    metadata = document.metadata
    page = metadata.get("page")

    if page is not None:
        page = int(page) + 1

    return {
        "citation_index": index,
        "document_id": metadata.get("document_id"),
        "filename": metadata.get(
            "filename",
            metadata.get("source", "Unknown document"),
        ),
        "page": page,
        "excerpt": document.page_content,
    }


def format_evidence(documents):
    sources = [
        document_to_source(document, index)
        for index, document in enumerate(documents or [], start=1)
    ]

    if not sources:
        return json.dumps(
            {
                "message": "No relevant evidence was found.",
                "sources": [],
            },
            ensure_ascii=False,
        )

    return json.dumps(
        {
            "message": "Retrieved evidence follows.",
            "sources": sources,
        },
        ensure_ascii=False,
    )


def create_search_knowledge_base_tool(rag_service):
    @tool
    def search_knowledge_base(question: str, knowledge_base_id: int) -> str:
        """Search a knowledge base once and return structured document evidence.
        Use the specified knowledge base ID. Do not repeat the same search
        unless the previous result was insufficient and a meaningfully
        different search is needed.
        """
        documents = rag_service.retrieve(
            question=question,
            knowledge_base_id=knowledge_base_id,
            k=5,
        )

        return format_evidence(documents)

    return search_knowledge_base


def create_search_document_tool(rag_service):
    @tool
    def search_document(question: str, document_id: str) -> str:
        """Search one indexed PDF using its exact document UUID.
        Return structured evidence with filenames and page numbers.
        """
        retriever = rag_service.set_retriever(
            document_id=document_id,
            k=5,
        )
        documents = retriever.invoke(question)

        return format_evidence(documents)

    return search_document


def create_compare_documents_tool(rag_service):
    @tool
    def compare_documents(
        question: str,
        document_id_1: str,
        document_id_2: str,
    ) -> str:
        """Retrieve evidence for the same question from two indexed PDFs.
        Use exact document UUIDs and return evidence for both documents.
        """
        retriever_1 = rag_service.set_retriever(
            document_id=document_id_1,
            k=3,
        )
        documents_1 = retriever_1.invoke(question)

        retriever_2 = rag_service.set_retriever(
            document_id=document_id_2,
            k=3,
        )
        documents_2 = retriever_2.invoke(question)

        sources_1 = [
            document_to_source(document, index)
            for index, document in enumerate(
                documents_1 or [],
                start=1,
            )
        ]

        sources_2 = [
            document_to_source(document, index)
            for index, document in enumerate(
                documents_2 or [],
                start=1,
            )
        ]

        return json.dumps(
            {
                "message": "Evidence retrieved for both documents.",
                "documents": [
                    {
                        "document_id": document_id_1,
                        "sources": sources_1,
                    },
                    {
                        "document_id": document_id_2,
                        "sources": sources_2,
                    },
                ],
                "sources": sources_1 + sources_2,
            },
            ensure_ascii=False,
        )

    return compare_documents


def create_verified_research_tool(rag_service):
    query_generator = create_query_generator(rag_service.llm)

    @tool
    def verified_research(question: str, knowledge_base_id: int) -> str:
        """Generate one cited research answer with grounding and
        citation verification. Prefer this tool when a verified answer
        is needed. Do not call it repeatedly for the same question.
        """
        retriever = rag_service.set_retriever(
            knowledge_base_id=knowledge_base_id,
            k=5,
        )

        pipeline = create_verified_rag(
            retriever=retriever,
            query_generator=query_generator,
            llm=rag_service.llm,
            use_multi_query=False,
        )

        result = pipeline(question)
        verification = result["verification"]

        sources = [
            document_to_source(document, index)
            for index, document in enumerate(
                result["documents"],
                start=1,
            )
        ]

        return json.dumps(
            {
                "answer": result["answer"],
                "sources": sources,
                "retrieval_mode": result["retrieval_mode"],
                "verification_verdict": verification.verdict,
                "grounded": verification.grounded,
                "citations_valid": verification.citations_valid,
                "unsupported_claims": verification.unsupported_claims,
                "verification_explanation": verification.explanation,
            },
            ensure_ascii=False,
        )

    return verified_research
