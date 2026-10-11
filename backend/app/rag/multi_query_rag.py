from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel

from app.retrieval.multi_query import (
    generate_queries,
    retrieve_from_queries,
    deduplicate_documents,
)


def format_documents(documents):
    return "\n\n".join(
        document.page_content
        for document in documents
    )


def retrieve_documents(retriever, query_generator, question):
    queries = generate_queries(
        query_generator,
        question,
    )

    documents = retrieve_from_queries(
        retriever,
        queries,
    )

    unique_documents = deduplicate_documents(documents)

    return {
        "question": question,
        "queries": queries,
        "documents": unique_documents,
        "raw_document_count": len(documents),
        "unique_document_count": len(unique_documents),
    }


def create_multi_query_rag_chain(
    retriever,
    query_generator,
    llm,
):
    prompt = ChatPromptTemplate.from_template(
        """Answer the question using only the provided context.

If the answer cannot be found in the context, say that the information is not available.

Context:
{context}

Question:
{question}
"""
    )

    retrieval = RunnableLambda(
        lambda question: retrieve_documents(
            retriever,
            query_generator,
            question,
        )
    )

    prepare_generation = RunnableParallel(
        context=RunnableLambda(
            lambda data: format_documents(
                data["documents"]
            )
        ),
        question=RunnableLambda(
            lambda data: data["question"]
        ),
    )

    generation = (
        prepare_generation
        | prompt
        | llm
        | StrOutputParser()
    )

    return RunnableParallel(
        retrieval=retrieval,
        answer=retrieval | generation,
    )