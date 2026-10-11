from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough


def format_documents(documents):
    return "\n\n".join(document.page_content for document in documents)


def create_rag_chain(retriever, llm):
    prompt = ChatPromptTemplate.from_template(
        """Answer the question using only the provided context.

If the answer cannot be found in the context, say that the information is not available.

Context:
{context}

Question:
{question}
"""
    )

    retrieval = retriever | RunnableLambda(format_documents)

    return (
        RunnableParallel(
            context=retrieval,
            question=RunnablePassthrough()
        )
        | prompt
        | llm
        | StrOutputParser()
    )