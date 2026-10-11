from dotenv import load_dotenv

from app.rag.rag_service import RAGService


load_dotenv()


def main():
    rag_service = RAGService()

    rag_service.initialize()
    rag_service.initialize_llm()

    document = rag_service.add_document(
        "data/Vol7_3_7.pdf",
        document_id="vol7_3_7",
    )

    print("\nDocument:\n")
    print(document)

    rag_service.set_retriever(
        document_id="vol7_3_7",
    )

    question = (
        "What is the main topic of this document?"
    )

    answer = rag_service.ask(question)

    print("\nFinal Answer:\n")
    print(answer)


if __name__ == "__main__":
    main()