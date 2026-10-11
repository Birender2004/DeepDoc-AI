def format_documents_with_citations(documents):
    context_parts = []

    for index, document in enumerate(documents, start=1):
        source = document.metadata.get("source", "Unknown source")
        page = document.metadata.get("page")

        if page is not None:
            page = int(page) + 1
            source_info = f"{source}, Page {page}"
        else:
            source_info = source

        context_parts.append(
            f"[{index}] {source_info}\n"
            f"{document.page_content}"
        )

    return "\n\n".join(context_parts)