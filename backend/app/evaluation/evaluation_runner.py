from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from ragas import EvaluationDataset, evaluate
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import faithfulness, answer_relevancy
from ragas.run_config import RunConfig

from app.evaluation.dataset import evaluation_questions
from app.ingestion.embeddings import get_embedding_model
from app.ingestion.vector_store import (
    get_qdrant_client,
    get_vector_store,
    get_retriever,
)
from app.retrieval.multi_query import (
    create_query_generator,
    generate_queries,
    retrieve_from_queries,
    deduplicate_documents,
)


load_dotenv()


def create_answer_generator(llm):
    prompt = ChatPromptTemplate.from_template(
        """Answer the question using only the provided context.

If the answer cannot be found in the context,
say that the information is not available.

Context:
{context}

Question:
{question}
"""
    )

    return prompt | llm | StrOutputParser()


def retrieve_documents(retriever, query_generator, question):
    queries = generate_queries(
        query_generator,
        question,
    )

    documents = retrieve_from_queries(
        retriever,
        queries,
    )

    return deduplicate_documents(documents)


def create_ragas_dataset(
    retriever,
    query_generator,
    answer_generator,
):
    samples = []

    for index, item in enumerate(
        evaluation_questions,
        start=1,
    ):
        print(
            f"\nProcessing evaluation question "
            f"{index}/{len(evaluation_questions)}"
        )

        documents = retrieve_documents(
            retriever,
            query_generator,
            item["question"],
        )

        contexts = [
            document.page_content
            for document in documents
        ]

        context = "\n\n".join(contexts)

        answer = answer_generator.invoke(
            {
                "context": context,
                "question": item["question"],
            }
        )

        samples.append(
            {
                "user_input": item["question"],
                "retrieved_contexts": contexts,
                "response": answer,
                "reference": item["ground_truth"],
            }
        )

        print(
            f"Retrieved contexts: {len(contexts)}"
        )
        print(f"Answer: {answer}")

    return EvaluationDataset.from_list(samples)


def main():
    print("Starting RAGAS evaluation...")

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.6-flash",
        temperature=0,
    )

    ragas_llm = LangchainLLMWrapper(llm)

    embeddings = get_embedding_model()

    ragas_embeddings = LangchainEmbeddingsWrapper(
        embeddings
    )

    client = get_qdrant_client()

    vector_store = get_vector_store(
        client,
        embeddings,
    )

    retriever = get_retriever(
        vector_store,
        k=5,
    )

    query_generator = create_query_generator(
        llm
    )

    answer_generator = create_answer_generator(
        llm
    )

    print(
        f"Evaluation questions: "
        f"{len(evaluation_questions)}"
    )

    dataset = create_ragas_dataset(
        retriever,
        query_generator,
        answer_generator,
    )

    print("\nRunning RAGAS metrics...")

    run_config = RunConfig(
        timeout=300,
        max_retries=2,
        max_wait=10,
        max_workers=1,
    )

    result = evaluate(
        dataset=dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
        ],
        llm=ragas_llm,
        embeddings=ragas_embeddings,
        run_config=run_config,
        raise_exceptions=True,
    )

    print("\nEvaluation Results:\n")
    print(result)


if __name__ == "__main__":
    main()