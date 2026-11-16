const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure the FastAPI server is running."
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {
      // Keep the default error message.
    }

    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) return null;

  return response.json();
}

export function getKnowledgeBases() {
  return apiRequest("/knowledge-bases");
}

export function createKnowledgeBase(name) {
  return apiRequest("/knowledge-bases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

export function deleteKnowledgeBase(knowledgeBaseId) {
  return apiRequest(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
    { method: "DELETE" }
  );
}

export function getDocuments(knowledgeBaseId) {
  const query = knowledgeBaseId
    ? `?knowledge_base_id=${encodeURIComponent(knowledgeBaseId)}`
    : "";

  return apiRequest(`/documents${query}`);
}

export function uploadDocument(file, knowledgeBaseId) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest(
    `/documents/upload?knowledge_base_id=${encodeURIComponent(knowledgeBaseId)}`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export function reindexDocument(documentId) {
  return apiRequest(
    `/documents/${encodeURIComponent(documentId)}/reindex`,
    { method: "POST" }
  );
}

export function deleteDocument(documentId) {
  return apiRequest(
    `/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
}

export function queryDocuments(question, knowledgeBaseId, documentId = null) {
  return apiRequest("/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      knowledge_base_id: Number(knowledgeBaseId),
      document_id: documentId || null,
    }),
  });
}

export function verifiedResearch(question, knowledgeBaseId) {
  return apiRequest("/verified-research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      knowledge_base_id: Number(knowledgeBaseId),
    }),
  });
}

export function agentResearch(question, knowledgeBaseId) {
  return apiRequest("/agent-research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      knowledge_base_id: Number(knowledgeBaseId),
    }),
  });
}
