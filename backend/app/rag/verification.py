from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate


class VerificationResult(BaseModel):
    verdict: str = Field(
        description="SUPPORTED or UNSUPPORTED"
    )
    grounded: bool
    citations_valid: bool
    unsupported_claims: list[str]
    explanation: str


def create_verifier(llm):
    prompt = ChatPromptTemplate.from_template(
        """You are a strict RAG answer verifier.

Evaluate whether the answer is fully supported by the provided evidence.

Check every factual claim in the answer against the evidence.

Check whether citation numbers refer to evidence that actually supports the associated claims.

Mark the answer as SUPPORTED only if the claims are adequately supported by the evidence and the citations are valid.

Otherwise mark it as UNSUPPORTED.

Question:
{question}

Evidence:
{context}

Answer:
{answer}
"""
    )

    return prompt | llm.with_structured_output(
        VerificationResult
    )