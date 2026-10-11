from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.document_repository import (
    get_document,
    get_document_by_filename,
    list_documents,
)
from app.database.knowledge_base_repository import get_knowledge_base
from app.rag.rag_service import RAGService
from app.schemas.document import DocumentResponse


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


@router.get(
    "",
    response_model=list[DocumentResponse],
)
def get_documents(
    knowledge_base_id: int | None = None,
    db: Session = Depends(get_db),
):
    if knowledge_base_id is not None:
        knowledge_base = get_knowledge_base(
            db,
            knowledge_base_id,
        )

        if knowledge_base is None:
            raise HTTPException(
                status_code=404,
                detail="Knowledge base not found.",
            )

    return list_documents(
        db,
        knowledge_base_id=knowledge_base_id,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document_details(
    document_id: str,
    db: Session = Depends(get_db),
):
    document = get_document(
        db,
        document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return document


@router.post(
    "/upload",
    response_model=DocumentResponse,
)
async def upload_document(
    knowledge_base_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    knowledge_base = get_knowledge_base(
        db,
        knowledge_base_id,
    )

    if knowledge_base is None:
        raise HTTPException(
            status_code=404,
            detail="Knowledge base not found.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    if Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    existing_document = get_document_by_filename(
        db,
        file.filename,
        knowledge_base_id,
    )

    if existing_document is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Document '{file.filename}' already exists "
                "in this knowledge base."
            ),
        )

    document_id = str(uuid4())
    file_path = UPLOAD_DIR / f"{document_id}.pdf"

    try:
        contents = await file.read()
        file_path.write_bytes(contents)

        rag_service = RAGService()
        rag_service.initialize()

        rag_service.add_document(
            db=db,
            file_path=str(file_path),
            document_id=document_id,
            filename=file.filename,
            knowledge_base_id=knowledge_base_id,
        )

        document = get_document(
            db,
            document_id,
        )

        return document

    except Exception as exc:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Document ingestion failed: {str(exc)}",
        )


@router.post(
    "/{document_id}/reindex",
    response_model=DocumentResponse,
)
def reindex_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    document = get_document(
        db,
        document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    rag_service = RAGService()
    rag_service.initialize()

    try:
        rag_service.reindex_document(
            db=db,
            file_path=document.file_path,
            document_id=document.document_id,
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Document file not found.",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Document reindexing failed: {str(exc)}",
        )

    return get_document(
        db,
        document_id,
    )


@router.delete(
    "/{document_id}",
)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    document = get_document(
        db,
        document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    file_path = Path(document.file_path)

    rag_service = RAGService()
    rag_service.initialize()

    try:
        rag_service.delete_document(
            db=db,
            document_id=document_id,
        )

        if file_path.exists():
            file_path.unlink()

        return {
            "message": "Document deleted successfully.",
            "document_id": document_id,
            "filename": document.filename,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Document deletion failed: {str(exc)}",
        )
