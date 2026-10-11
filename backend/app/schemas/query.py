from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    knowledge_base_id: int
    document_id: str | None = None


class Source(BaseModel):
    document_id: str
    filename: str
    page: int | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source] = Field(default_factory=list)
