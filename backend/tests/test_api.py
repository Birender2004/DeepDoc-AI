
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import app
from app.database.database import Base, get_db
from app.database import models


@pytest.fixture
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    testing_session_local = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
    )

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Do not use a context manager: that would run the app lifespan.
    test_client = TestClient(app, raise_server_exceptions=True)

    try:
        yield test_client
    finally:
        test_client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "DeepDoc AI",
    }


def test_health_endpoint_is_consistent(client):
    first_response = client.get("/health")
    second_response = client.get("/health")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json() == second_response.json()


def test_missing_document_returns_404(client):
    response = client.get("/documents/nonexistent-document")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_missing_knowledge_base_document_filter_returns_404(client):
    response = client.get(
        "/documents",
        params={"knowledge_base_id": 999},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Knowledge base not found."


def test_non_pdf_upload_returns_400(client):
    response = client.post(
        "/knowledge-bases",
        json={"name": "Test Knowledge Base"},
    )

    assert response.status_code == 200

    knowledge_base_id = response.json()["id"]

    upload_response = client.post(
        "/documents/upload",
        params={"knowledge_base_id": knowledge_base_id},
        files={
            "file": (
                "notes.txt",
                b"test content",
                "text/plain",
            )
        },
    )

    assert upload_response.status_code == 400
    assert upload_response.json()["detail"] == (
        "Only PDF files are supported."
    )


def test_missing_knowledge_base_delete_returns_404(client):
    response = client.delete("/knowledge-bases/999")

    assert response.status_code == 404
