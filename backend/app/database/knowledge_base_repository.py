from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models import KnowledgeBase


def create_knowledge_base(
    db: Session,
    name: str,
):
    existing = get_knowledge_base_by_name(db, name)

    if existing is not None:
        raise ValueError(
            f"Knowledge base '{name}' already exists."
        )

    knowledge_base = KnowledgeBase(name=name)
    db.add(knowledge_base)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError(
            f"Knowledge base '{name}' already exists."
        )

    db.refresh(knowledge_base)
    return knowledge_base


def get_knowledge_base(
    db: Session,
    knowledge_base_id: int,
):
    return (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == knowledge_base_id)
        .first()
    )


def get_knowledge_base_by_name(
    db: Session,
    name: str,
):
    return (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.name == name)
        .first()
    )


def list_knowledge_bases(
    db: Session,
):
    return (
        db.query(KnowledgeBase)
        .order_by(KnowledgeBase.created_at.desc())
        .all()
    )


def delete_empty_knowledge_base(
    db: Session,
    knowledge_base_id: int,
):
    knowledge_base = get_knowledge_base(
        db,
        knowledge_base_id,
    )

    if knowledge_base is None:
        raise LookupError("Knowledge base not found.")

    if knowledge_base.documents:
        raise ValueError(
            "Cannot delete a knowledge base that contains documents."
        )

    db.delete(knowledge_base)
    db.commit()

    return knowledge_base