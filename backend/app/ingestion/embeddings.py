from sentence_transformers import SentenceTransformer
from langchain_core.embeddings import Embeddings


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


class LocalEmbeddings(Embeddings):
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)

    def embed_documents(self, texts):
        vectors = self.model.encode(
            texts,
            normalize_embeddings=True,
        )
        return vectors.tolist()

    def embed_query(self, text):
        vector = self.model.encode(
            text,
            normalize_embeddings=True,
        )
        return vector.tolist()


def get_embedding_model():
    return LocalEmbeddings()