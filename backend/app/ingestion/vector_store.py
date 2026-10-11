from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    Filter,
    FieldCondition,
    MatchValue,
    VectorParams,
)
from langchain_qdrant import QdrantVectorStore


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "deepdoc_documents"


def get_qdrant_client():
    return QdrantClient(url=QDRANT_URL)


def create_collection(client, vector_size: int):
    if client.collection_exists(COLLECTION_NAME):
        collection = client.get_collection(COLLECTION_NAME)

        existing_size = (
            collection.config.params.vectors.size
        )

        if existing_size != vector_size:
            raise ValueError(
                f"Collection '{COLLECTION_NAME}' has "
                f"vector size {existing_size}, but the "
                f"current embedding model produces "
                f"vectors of size {vector_size}. "
                f"Delete and recreate the collection "
                f"before indexing."
            )

        print(
            f"Collection '{COLLECTION_NAME}' already "
            f"exists with vector size {existing_size}."
        )

        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=vector_size,
            distance=Distance.COSINE,
        ),
    )

    print(
        f"Collection '{COLLECTION_NAME}' created "
        f"with vector size {vector_size}."
    )


def delete_collection(client):
    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)

        print(
            f"Collection '{COLLECTION_NAME}' deleted."
        )
    else:
        print(
            f"Collection '{COLLECTION_NAME}' "
            f"does not exist."
        )


def get_vector_store(client, embeddings):
    return QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding=embeddings,
    )


def get_retriever(
    vector_store,
    k: int = 5,
    knowledge_base_id: int | None = None,
):
    search_kwargs = {
        "k": k,
    }

    if knowledge_base_id is not None:
        search_kwargs["filter"] = Filter(
            must=[
                FieldCondition(
                    key="metadata.knowledge_base_id",
                    match=MatchValue(
                        value=knowledge_base_id,
                    ),
                )
            ]
        )

    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs=search_kwargs,
    )


def delete_documents_by_id(
    client,
    document_id: str,
):
    document_filter = Filter(
        must=[
            FieldCondition(
                key="metadata.document_id",
                match=MatchValue(
                    value=document_id,
                ),
            )
        ]
    )

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=document_filter,
    )

    print(
        f"Deleted document '{document_id}' "
        f"from collection '{COLLECTION_NAME}'."
    )