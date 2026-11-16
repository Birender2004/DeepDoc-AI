from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.knowledge_base_repository import (
    create_knowledge_base,
    delete_empty_knowledge_base,
    list_knowledge_bases,
)
from app.schemas.knowledge_base import (
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
)

router = APIRouter(
    prefix="/knowledge-bases",
    tags=["Knowledge Bases"],
)


@router.post(
    "",
    response_model=KnowledgeBaseResponse,
)
def create(
    data: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_knowledge_base(
            db,
            data.name,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )


@router.get(
    "",
    response_model=list[KnowledgeBaseResponse],
)
def list_all(
    db: Session = Depends(get_db),
):
    return list_knowledge_bases(db)


@router.delete("/{knowledge_base_id}")
def delete(
    knowledge_base_id: int,
    db: Session = Depends(get_db),
):
    try:
        delete_empty_knowledge_base(
            db,
            knowledge_base_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )

    return {
        "message": "Knowledge base deleted successfully."
    }