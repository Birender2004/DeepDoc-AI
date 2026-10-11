import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sqlalchemy.orm import Session

from app.database.document_repository import (
    create_document,
    get_document,
    update_document_status,
)
from app.ingestion.chunker import split_documents
from app.ingestion.embeddings import get_embedding_model
from app.ingestion.metadata import add_document_metadata
from app.ingestion.pdf_loader import load_pdf
from app.ingestion.vector_store import (
    create_collection,
    delete_documents_by_id,
    get_qdrant_client,
    get_retriever,
    get_vector_store,
)
from app.rag.basic_rag import create_rag_chain


load_dotenv()


class RAGService:
    def __init__(self):
        self.client = None
        self.embeddings = None
        self.vector_store = None
        self.retriever = None
        self.rag_chain = None
        self.llm = None

    def initialize(self):
        self.embeddings = get_embedding_model()
        vector_size = len(self.embeddings.embed_query("test"))
        self.client = get_qdrant_client()

        create_collection(self.client, vector_size)

        self.vector_store = get_vector_store(
            self.client,
            self.embeddings,
        )

        return self

    def initialize_llm(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.6-flash",
            temperature=0,
            google_api_key=api_key,
        )

        return self

    def add_document(
        self,
        db: Session,
        file_path: str,
        document_id: str,
        filename: str,
        knowledge_base_id: int,
    ):
        create_document(
            db=db,
            document_id=document_id,
            filename=filename,
            file_path=file_path,
            knowledge_base_id=knowledge_base_id,
            status="uploaded",
        )

        try:
            documents = load_pdf(file_path)
            documents = add_document_metadata(
                documents,
                file_path,
                document_id,
                knowledge_base_id,
            )

            for document in documents:
                document.metadata["filename"] = filename

            chunks = split_documents(documents)
            self.vector_store.add_documents(chunks)

            update_document_status(db, document_id, "indexed")

            return {
                "document_id": document_id,
                "filename": filename,
                "status": "indexed",
                "chunks": len(chunks),
            }

        except Exception:
            update_document_status(db, document_id, "failed")
            raise

    def set_retriever(
        self,
        document_id: str | None = None,
        knowledge_base_id: int | None = None,
        k: int = 5,
    ):
        if document_id is not None:
            document_filter = Filter(
                must=[
                    FieldCondition(
                        key="metadata.document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            )

            self.retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={
                    "k": k,
                    "filter": document_filter,
                },
            )
        else:
            self.retriever = get_retriever(
                self.vector_store,
                k=k,
                knowledge_base_id=knowledge_base_id,
            )

        self.rag_chain = create_rag_chain(
            self.retriever,
            self.llm,
        )

        return self.retriever

    def retrieve(
        self,
        question: str,
        knowledge_base_id: int,
        k: int = 5,
    ):
        retriever = get_retriever(
            self.vector_store,
            k=k,
            knowledge_base_id=knowledge_base_id,
        )

        return retriever.invoke(question)

    def ask(self, question: str):
        if self.rag_chain is None:
            raise ValueError("Retriever has not been configured.")

        return self.rag_chain.invoke(question)

    def delete_document(
        self,
        db: Session,
        document_id: str,
    ):
        document = get_document(db, document_id)

        if document is None:
            raise ValueError(
                f"Document '{document_id}' not found."
            )

        delete_documents_by_id(self.client, document_id)

        db.delete(document)
        db.commit()

        return True

    def reindex_document(
        self,
        db: Session,
        file_path: str,
        document_id: str,
    ):
        existing_document = get_document(db, document_id)

        if existing_document is None:
            raise ValueError(
                f"Document '{document_id}' not found."
            )

        filename = existing_document.filename
        knowledge_base_id = existing_document.knowledge_base_id

        if not os.path.exists(file_path):
            raise FileNotFoundError(file_path)

        delete_documents_by_id(self.client, document_id)
        update_document_status(db, document_id, "uploaded")

        try:
            documents = load_pdf(file_path)
            documents = add_document_metadata(
                documents,
                file_path,
                document_id,
                knowledge_base_id,
            )

            for document in documents:
                document.metadata["filename"] = filename

            chunks = split_documents(documents)
            self.vector_store.add_documents(chunks)

            update_document_status(db, document_id, "indexed")

            return {
                "document_id": document_id,
                "filename": filename,
                "status": "indexed",
                "chunks": len(chunks),
            }

        except Exception:
            update_document_status(db, document_id, "failed")
            raise