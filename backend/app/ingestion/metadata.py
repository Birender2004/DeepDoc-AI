from pathlib import Path
from uuid import uuid4


def add_document_metadata(
    documents,
    file_path: str,
    document_id: str | None = None,
    knowledge_base_id: int | None = None,
):
    path = Path(file_path)

    if document_id is None:
        document_id = str(uuid4())

    for document in documents:
        document.metadata["document_id"] = document_id
        document.metadata["filename"] = path.name

        if knowledge_base_id is not None:
            document.metadata["knowledge_base_id"] = knowledge_base_id

    return documents