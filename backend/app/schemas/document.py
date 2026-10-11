from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    document_id: str
    filename: str
    file_path: str
    status: str
    created_at: datetime
    knowledge_base_id: int

    model_config = ConfigDict(
        from_attributes=True
    )