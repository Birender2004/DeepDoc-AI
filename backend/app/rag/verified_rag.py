from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.rag.citations import format_documents_with_citations
from app.rag.verification import create_verifier
from app.retrieval.multi_query import (
    generate_queries,
    retrieve_from_queries,
    deduplicate_documents,
)


def retrieve_documents(
    retriever,
    query_generator,
    question,
):
    queries = generate_queries(
        query_generator,
        question,
    )

    documents = retrieve_from_queries(
        retriever,
        queries,
    )

    unique_documents = deduplicate_documents(
        documents
    )

    return {
        "question": question,
        "queries": queries,
        "documents": unique_documents,
        "raw_document_count": len(documents),
        "unique_document_count": len(unique_documents),
    }


def create_answer_generator(llm):
    prompt = ChatPromptTemplate.from_template(
        """Answer the question using only the provided evidence.

Every factual claim must include one or more citations in the format [1], [2], etc.

Do not invent citation numbers.

If the evidence does not contain enough information to answer the question, say that the information is not available.

Evidence:
{context}

Question:
{question}
"""
    )

    return prompt | llm | StrOutputParser()


def create_verified_rag(
    retriever,
    query_generator,
    llm,
):
    answer_generator = create_answer_generator(
        llm
    )

    verifier = create_verifier(llm)

    def run(question):
        retrieval = retrieve_documents(
            retriever,
            query_generator,
            question,
        )

        context = format_documents_with_citations(
            retrieval["documents"]
        )

        answer = answer_generator.invoke(
            {
                "context": context,
                "question": question,
            }
        )

        verification = verifier.invoke(
            {
                "question": question,
                "context": context,
                "answer": answer,
            }
        )

        return {
            "question": question,
            "queries": retrieval["queries"],
            "documents": retrieval["documents"],
            "raw_document_count": retrieval[
                "raw_document_count"
            ],
            "unique_document_count": retrieval[
                "unique_document_count"
            ],
            "answer": answer,
            "verification": verification,
        }

    return run