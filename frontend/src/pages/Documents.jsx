
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteDocument,
  getDocuments,
  getKnowledgeBases,
  reindexDocument,
  uploadDocument,
} from "../services/api";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusClass(status) {
  const normalized = (status || "unknown").toLowerCase();

  if (normalized === "indexed") return "document-status status-indexed";
  if (normalized === "failed" || normalized === "error") {
    return "document-status status-failed";
  }

  return "document-status status-pending";
}

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState("all");
  const [uploadKnowledgeBaseId, setUploadKnowledgeBaseId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState("");
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [documentData, knowledgeBaseData] = await Promise.all([
        getDocuments(),
        getKnowledgeBases(),
      ]);

      if (!Array.isArray(documentData) || !Array.isArray(knowledgeBaseData)) {
        throw new Error("The backend returned an unexpected response.");
      }

      setDocuments(documentData);
      setKnowledgeBases(knowledgeBaseData);

      setUploadKnowledgeBaseId((current) => {
        if (
          current &&
          knowledgeBaseData.some((item) => String(item.id) === current)
        ) {
          return current;
        }

        return knowledgeBaseData.length
          ? String(knowledgeBaseData[0].id)
          : "";
      });
    } catch (err) {
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDocuments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesKnowledgeBase =
        selectedKnowledgeBase === "all" ||
        String(document.knowledge_base_id) === selectedKnowledgeBase;

      const matchesSearch =
        !search ||
        document.filename?.toLowerCase().includes(search) ||
        document.document_id?.toLowerCase().includes(search) ||
        document.status?.toLowerCase().includes(search);

      return matchesKnowledgeBase && matchesSearch;
    });
  }, [documents, searchTerm, selectedKnowledgeBase]);

  const knowledgeBaseName = (id) =>
    knowledgeBases.find((item) => item.id === id)?.name ||
    `Knowledge base ${id}`;

  const indexedCount = documents.filter(
    (document) => document.status?.toLowerCase() === "indexed"
  ).length;

  async function handleUpload(event) {
    event.preventDefault();
    setUploadError("");
    setSuccess("");

    if (!selectedFile) {
      setUploadError("Please select a PDF file.");
      return;
    }

    if (
      !selectedFile.name.toLowerCase().endsWith(".pdf") ||
      (selectedFile.type && selectedFile.type !== "application/pdf")
    ) {
      setUploadError("Please select a valid PDF file.");
      return;
    }

    if (!uploadKnowledgeBaseId) {
      setUploadError("Please select a knowledge base.");
      return;
    }

    setUploading(true);

    try {
      const uploadedDocument = await uploadDocument(
        selectedFile,
        uploadKnowledgeBaseId
      );

      setSuccess(
        `${uploadedDocument?.filename || selectedFile.name} uploaded successfully.`
      );
      setSelectedFile(null);

      const fileInput = document.getElementById("document-pdf-file");
      if (fileInput) fileInput.value = "";

      await loadData();
    } catch (err) {
      setUploadError(err.message || "Document upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleReindex(document) {
    const confirmed = window.confirm(
      `Reindex "${document.filename}"? This may take some time.`
    );

    if (!confirmed) return;

    setBusyDocumentId(document.document_id);
    setActionError("");
    setSuccess("");

    try {
      await reindexDocument(document.document_id);
      setSuccess(`Reindex request completed for ${document.filename}.`);
      await loadData();
    } catch (err) {
      setActionError(err.message || "Failed to reindex document.");
    } finally {
      setBusyDocumentId("");
    }
  }

  async function handleDelete(document) {
    const confirmed = window.confirm(
      `Delete "${document.filename}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setBusyDocumentId(document.document_id);
    setActionError("");
    setSuccess("");

    try {
      await deleteDocument(document.document_id);
      setDocuments((current) =>
        current.filter((item) => item.document_id !== document.document_id)
      );
      setSuccess(`${document.filename} was deleted successfully.`);
    } catch (err) {
      setActionError(err.message || "Failed to delete document.");
    } finally {
      setBusyDocumentId("");
    }
  }

  return (
    <div className="dashboard-page">
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Document library</h2>
            <p>Upload PDFs and manage your research documents.</p>
          </div>

          <button
            className="button-secondary"
            onClick={loadData}
            disabled={loading || uploading || Boolean(busyDocumentId)}
            type="button"
          >
            <RefreshCw size={16} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <div className="metric-icon blue">
              <FileText size={20} />
            </div>
            <div className="metric-label">Total documents</div>
            <div className="metric-value">{documents.length}</div>
            <div className="metric-note">Documents in your workspace</div>
          </article>

          <article className="metric-card">
            <div className="metric-icon green">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-label">Indexed documents</div>
            <div className="metric-value">{indexedCount}</div>
            <div className="metric-note">Available for retrieval</div>
          </article>
        </div>

        <section className="upload-panel">
          <div className="upload-panel-heading">
            <div className="upload-panel-icon">
              <Upload size={20} />
            </div>
            <div>
              <h3>Upload a PDF</h3>
              <p>Add a document to one of your knowledge bases.</p>
            </div>
          </div>

          <form className="upload-form" onSubmit={handleUpload}>
            <label className="upload-field">
              <span>Knowledge base</span>
              <select
                value={uploadKnowledgeBaseId}
                onChange={(event) =>
                  setUploadKnowledgeBaseId(event.target.value)
                }
                disabled={uploading || knowledgeBases.length === 0}
                required
              >
                <option value="" disabled>
                  Select a knowledge base
                </option>
                {knowledgeBases.map((knowledgeBase) => (
                  <option key={knowledgeBase.id} value={String(knowledgeBase.id)}>
                    {knowledgeBase.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="upload-field">
              <span>PDF file</span>
              <input
                id="document-pdf-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setUploadError("");
                  setSuccess("");
                }}
                disabled={uploading}
                required
              />
            </label>

            {selectedFile && (
              <div className="selected-file">
                <FileText size={17} />
                <span>{selectedFile.name}</span>
                <span>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}

            {uploadError && (
              <div className="upload-message upload-message-error" role="alert">
                <AlertCircle size={17} />
                <span>{uploadError}</span>
              </div>
            )}

            {success && (
              <div
                className="upload-message upload-message-success"
                role="status"
              >
                <CheckCircle2 size={17} />
                <span>{success}</span>
              </div>
            )}

            <button
              className="button-primary upload-submit"
              type="submit"
              disabled={uploading || knowledgeBases.length === 0}
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload document"}
            </button>
          </form>
        </section>

        {(error || actionError) && (
          <div className="placeholder-note" role="alert">
            <AlertCircle size={17} />
            <span>{error || actionError}</span>
            {error && (
              <button
                className="button-secondary"
                onClick={loadData}
                type="button"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="document-toolbar">
          <label className="document-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <select
            className="document-filter"
            value={selectedKnowledgeBase}
            onChange={(event) => setSelectedKnowledgeBase(event.target.value)}
            aria-label="Filter by knowledge base"
          >
            <option value="all">All knowledge bases</option>
            {knowledgeBases.map((knowledgeBase) => (
              <option key={knowledgeBase.id} value={String(knowledgeBase.id)}>
                {knowledgeBase.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="placeholder-page">
            <RefreshCw size={24} />
            <h2>Loading documents...</h2>
            <p>Connecting to your backend.</p>
          </div>
        ) : !error && filteredDocuments.length === 0 ? (
          <div className="placeholder-page">
            <div className="placeholder-icon">
              <FileText size={27} />
            </div>
            <h2>
              {documents.length === 0
                ? "No documents found"
                : "No matching documents"}
            </h2>
            <p>
              {documents.length === 0
                ? "Upload a PDF above to add your first document."
                : "Try changing the search term or knowledge-base filter."}
            </p>
          </div>
        ) : !error ? (
          <div className="document-list">
            {filteredDocuments.map((document) => {
              const busy = busyDocumentId === document.document_id;

              return (
                <article className="document-row" key={document.id}>
                  <div className="document-file-icon">
                    <FileText size={22} />
                  </div>

                  <div className="document-main">
                    <h3>{document.filename}</h3>
                    <p>{knowledgeBaseName(document.knowledge_base_id)}</p>
                    <span className="document-date">
                      Added {formatDate(document.created_at)}
                    </span>
                  </div>

                  <div className="document-meta">
                    <span className={statusClass(document.status)}>
                      {document.status || "unknown"}
                    </span>
                    <span className="document-id">
                      ID: {document.document_id}
                    </span>

                    <div className="document-actions">
                      <button
                        className="document-action-button"
                        type="button"
                        onClick={() => handleReindex(document)}
                        disabled={busy || Boolean(busyDocumentId)}
                        title="Reindex document"
                      >
                        <RefreshCw size={14} />
                        {busy ? "Working..." : "Reindex"}
                      </button>
                      <button
                        className="document-action-button document-delete-button"
                        type="button"
                        onClick={() => handleDelete(document)}
                        disabled={busy || Boolean(busyDocumentId)}
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
