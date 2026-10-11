from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.documents import router as document_router
from app.routes.knowledge_bases import (
    router as knowledge_base_router,
)
from app.routes.query import router as query_router


app = FastAPI(
    title="DeepDoc AI",
    description="Advanced RAG document intelligence API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(knowledge_base_router)
app.include_router(document_router)
app.include_router(query_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "DeepDoc AI",
    }