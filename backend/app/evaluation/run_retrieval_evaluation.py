
from app.evaluation.dataset import evaluation_questions
from app.rag.rag_service import RAGService


KNOWLEDGE_BASE_ID = 2
EXPECTED_TERMS = [
    {"Java", "Python"},
    {"MySQL", "MongoDB"},
]


def main():
    rag_service = RAGService()
    rag_service.initialize()

    passed = 0

    try:
        for index, item in enumerate(evaluation_questions):
            question = item["question"]
            expected_terms = EXPECTED_TERMS[index]

            documents = rag_service.retrieve(
                question=question,
                knowledge_base_id=KNOWLEDGE_BASE_ID,
                k=5,
            )

            cv_documents = [
                document
                for document in documents
                if document.metadata.get("filename") == "CV.pdf"
            ]

            retrieved_text = " ".join(
                document.page_content
                for document in cv_documents
            ).casefold()

            missing_terms = [
                term
                for term in expected_terms
                if term.casefold() not in retrieved_text
            ]

            success = bool(cv_documents) and not missing_terms

            if success:
                passed += 1

            print(f"\nQuestion {index + 1}: {question}")
            print(f"Retrieved chunks: {len(documents)}")
            print(f"CV chunks: {len(cv_documents)}")
            print(f"Expected terms: {', '.join(sorted(expected_terms))}")
            print(f"Missing terms: {', '.join(missing_terms) or 'None'}")
            print(f"Result: {'PASS' if success else 'FAIL'}")

            for document in cv_documents:
                print(
                    "Source:",
                    document.metadata.get("filename"),
                    "| Page:",
                    document.metadata.get("page"),
                )

    finally:
        if rag_service.client is not None:
            rag_service.client.close()

    total = len(evaluation_questions)
    print(f"\nRetrieval evaluation: {passed}/{total} questions passed")


if __name__ == "__main__":
    main()
