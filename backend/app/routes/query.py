from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.document_repository import get_document
from app.database.knowledge_base_repository import get_knowledge_base
from app.rag.rag_service import RAGService
from app.schemas.query import QueryRequest, QueryResponse


router = APIRouter(
    prefix="/query",
    tags=["RAG"],
)


@router.post(
    "",
    response_model=QueryResponse,
)
def query_documents(
    request: QueryRequest,
    db: Session = Depends(get_db),
):
    knowledge_base = get_knowledge_base(
        db,
        request.knowledge_base_id,
    )

    if knowledge_base is None:
        raise HTTPException(
            status_code=404,
            detail="Knowledge base not found.",
        )

    selected_document = None

    if request.document_id is not None:
        selected_document = get_document(
            db,
            request.document_id,
        )

        if selected_document is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found.",
            )

        if (
            selected_document.knowledge_base_id
            != request.knowledge_base_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "The selected document does not belong "
                    "to this knowledge base."
                ),
            )

        if selected_document.status != "indexed":
            raise HTTPException(
                status_code=409,
                detail="The selected document is not indexed.",
            )

    rag_service = RAGService()

    try:
        rag_service.initialize()
        rag_service.initialize_llm()

        documents = rag_service.retrieve(
            question=request.question,
            knowledge_base_id=request.knowledge_base_id,
            k=5,
        ) if request.document_id is None else []

        if request.document_id is not None:
            rag_service.set_retriever(
                document_id=request.document_id,
                k=5,
            )

            documents = rag_service.retriever.invoke(
                request.question
            )

        if not documents:
            return QueryResponse(
                answer=(
                    "No relevant information was found "
                    "in the selected document."
                    if request.document_id is not None
                    else
                    "No relevant information was found "
                    "in this knowledge base."
                ),
                sources=[],
            )

        if request.document_id is None:
            rag_service.set_retriever(
                knowledge_base_id=request.knowledge_base_id,
                k=5,
            )

        answer = rag_service.ask(
            request.question
        )

        sources = []
        seen = set()

        for document in documents:
            metadata = document.metadata
            document_id = metadata.get("document_id")
            page = metadata.get("page")
            source_key = (document_id, page)

            if source_key in seen:
                continue

            seen.add(source_key)

            stored_document = (
                get_document(db, document_id)
                if document_id
                else None
            )

            sources.append(
                {
                    "document_id": document_id,
                    "filename": (
                        stored_document.filename
                        if stored_document
                        else metadata.get(
                            "filename",
                            "Unknown",
                        )
                    ),
                    "page": page,
                }
            )

        return QueryResponse(
            answer=str(answer),
            sources=sources,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"RAG query failed: {str(exc)}",
        )