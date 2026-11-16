
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


def create_query_generator(llm, num_queries=2):
    prompt = ChatPromptTemplate.from_template(
        """Generate exactly {num_queries} different search queries for the user's question.

Approach the question from different perspectives while preserving its original intent.

Return only the queries, one per line. Do not number them or add explanations.

Question:
{question}
"""
    )

    return (
        prompt
        | llm
        | StrOutputParser()
    ).with_config(
        run_name="multi_query_generator"
    )


def generate_queries(query_generator, question, num_queries=2):
    response = query_generator.invoke(
        {
            "question": question,
            "num_queries": num_queries,
        }
    )

    queries = [
        query.strip().lstrip("- ").strip()
        for query in response.splitlines()
        if query.strip()
    ]

    unique_queries = list(dict.fromkeys(queries))

    return unique_queries[:num_queries]


def retrieve_from_queries(retriever, queries):
    documents = []

    for query in queries:
        documents.extend(retriever.invoke(query))

    return documents


def deduplicate_documents(documents):
    unique_documents = []
    seen = set()

    for document in documents:
        key = (
            document.page_content,
            str(document.metadata),
        )

        if key not in seen:
            seen.add(key)
            unique_documents.append(document)

    return unique_documents


def multi_query_retrieve(
    retriever,
    query_generator,
    question,
    num_queries=2,
):
    queries = generate_queries(
        query_generator,
        question,
        num_queries=num_queries,
    )

    documents = retrieve_from_queries(
        retriever,
        queries,
    )

    unique_documents = deduplicate_documents(documents)

    return unique_documents, queries
