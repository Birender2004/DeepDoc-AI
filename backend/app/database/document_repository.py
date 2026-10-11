from sqlalchemy.orm import Session

from app.database.models import Document


def create_document(
    db: Session,
    document_id: str,
    filename: str,
    file_path: str,
    knowledge_base_id: int,
    status: str = "uploaded",
):
    document = Document(
        document_id=document_id,
        filename=filename,
        file_path=file_path,
        knowledge_base_id=knowledge_base_id,
        status=status,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


def get_document(
    db: Session,
    document_id: str,
):
    return (
        db.query(Document)
        .filter(Document.document_id == document_id)
        .first()
    )


def list_documents(
    db: Session,
    knowledge_base_id: int | None = None,
):
    query = db.query(Document)

    if knowledge_base_id is not None:
        query = query.filter(
            Document.knowledge_base_id == knowledge_base_id
        )

    return query.order_by(Document.created_at.desc()).all()


def get_document_by_filename(
    db: Session,
    filename: str,
    knowledge_base_id: int,
):
    return (
        db.query(Document)
        .filter(
            Document.filename == filename,
            Document.knowledge_base_id == knowledge_base_id,
        )
        .first()
    )


def update_document_status(
    db: Session,
    document_id: str,
    status: str,
):
    document = get_document(db, document_id)

    if document is None:
        raise ValueError(
            f"Document '{document_id}' not found."
        )

    document.status = status

    db.commit()
    db.refresh(document)

    return document


def delete_document(
    db: Session,
    document_id: str,
):
    document = get_document(db, document_id)

    if document is None:
        return False

    db.delete(document)
    db.commit()

    return True
