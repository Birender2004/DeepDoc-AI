from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


def create_query_generator(llm):
    prompt = ChatPromptTemplate.from_template(
        """Generate three different search queries for the user's question.

The queries should approach the question from different perspectives while preserving the original intent.

Return only the three queries, one per line.

Question:
{question}
"""
    )

    return prompt | llm | StrOutputParser()


def generate_queries(query_generator, question):
    response = query_generator.invoke({"question": question})

    queries = [
        query.strip()
        for query in response.splitlines()
        if query.strip()
    ]

    return queries


def retrieve_from_queries(retriever, queries):
    documents = []

    for query in queries:
        results = retriever.invoke(query)
        documents.extend(results)

    return documents


def deduplicate_documents(documents):
    unique_documents = []
    seen = set()

    for document in documents:
        key = (
            document.page_content,
            str(document.metadata)
        )

        if key not in seen:
            seen.add(key)
            unique_documents.append(document)

    return unique_documents


def multi_query_retrieve(retriever, query_generator, question):
    queries = generate_queries(
        query_generator,
        question,
    )

    documents = retrieve_from_queries(
        retriever,
        queries,
    )

    unique_documents = deduplicate_documents(documents)

    return unique_documents, queries