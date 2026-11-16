from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.rag.rag_service import RAGService
from app.routes.documents import router as document_router
from app.routes.knowledge_bases import router as knowledge_base_router
from app.routes.query import router as query_router
from app.routes.verified_research import router as verified_research_router
from app.routes.agent_research import router as agent_research_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    rag_service = RAGService()
    rag_service.initialize()
    rag_service.initialize_llm()
    app.state.rag_service = rag_service
    yield


app = FastAPI(
    title="DeepDoc AI",
    description="Advanced RAG document intelligence API",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(verified_research_router)
app.include_router(agent_research_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "DeepDoc AI"}
