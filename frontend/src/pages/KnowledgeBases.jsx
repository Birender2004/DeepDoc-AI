
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Database,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  getKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
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

export default function KnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");

  const loadKnowledgeBases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getKnowledgeBases();

      if (!Array.isArray(data)) {
        throw new Error("The backend returned an unexpected response.");
      }

      setKnowledgeBases(data);
    } catch (err) {
      setError(err.message || "Failed to load knowledge bases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  async function handleCreate(event) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a name for the knowledge base.");
      return;
    }

    setCreating(true);
    setError("");
    setNotice("");

    try {
      await createKnowledgeBase(trimmedName);
      setName("");
      setNotice("Knowledge base created successfully.");
      await loadKnowledgeBases();
    } catch (err) {
      setError(err.message || "Failed to create knowledge base.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(knowledgeBase) {
    if (
      !window.confirm(
        `Delete "${knowledgeBase.name}"? Only empty knowledge bases can be deleted.`
      )
    ) {
      return;
    }

    setDeletingId(knowledgeBase.id);
    setError("");
    setNotice("");

    try {
      await deleteKnowledgeBase(knowledgeBase.id);
      setNotice(`"${knowledgeBase.name}" was deleted successfully.`);
      await loadKnowledgeBases();
    } catch (err) {
      setError(err.message || "Failed to delete knowledge base.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h2>Your knowledge bases</h2>
          <p>
            Browse and manage the collections available in your DeepDoc AI
            workspace.
          </p>
        </div>

        <button
          className="button-secondary"
          onClick={loadKnowledgeBases}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <article
        className="action-card"
        style={{
          display: "grid",
          gridTemplateColumns: "40px minmax(180px, 1fr) auto",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <div className="action-icon">
          <Plus size={20} />
        </div>

        <div className="action-copy">
          <h3>Create a knowledge base</h3>
          <p>Organize your documents into a new collection.</p>
        </div>

        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            minWidth: 0,
            margin: 0,
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter knowledge base name"
            maxLength={200}
            required
            disabled={creating}
            aria-label="Knowledge base name"
            style={{
              boxSizing: "border-box",
              display: "block",
              flex: "0 0 240px",
              width: "240px",
              minWidth: 0,
              maxWidth: "240px",
              height: "42px",
              padding: "10px 12px",
              border: "1px solid rgba(176, 163, 214, 0.2)",
              borderRadius: "9px",
              backgroundColor: "#171525",
              color: "#f0edf9",
              fontFamily: "DM Sans, sans-serif",
              fontSize: "12px",
              colorScheme: "dark",
            }}
          />

          <button
            className="button-primary"
            type="submit"
            disabled={creating || !name.trim()}
            style={{ flexShrink: 0 }}
          >
            <Plus size={16} />
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </article>

      {notice && (
        <div className="placeholder-note" role="status">
          {notice}
        </div>
      )}

      {error && (
        <div className="placeholder-note" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button
            className="button-secondary"
            onClick={loadKnowledgeBases}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="placeholder-page">
          <RefreshCw size={24} />
          <h2>Loading knowledge bases...</h2>
          <p>Connecting to your backend.</p>
        </div>
      ) : !error && knowledgeBases.length === 0 ? (
        <div className="placeholder-page">
          <div className="placeholder-icon">
            <Database size={27} />
          </div>
          <h2>No knowledge bases yet</h2>
          <p>Create a knowledge base above to get started.</p>
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <article className="metric-card">
              <div className="metric-icon blue">
                <Database size={20} />
              </div>
              <div className="metric-label">Total knowledge bases</div>
              <div className="metric-value">{knowledgeBases.length}</div>
              <div className="metric-note">Loaded from your backend</div>
            </article>
          </div>

          <div className="actions-grid">
            {knowledgeBases.map((knowledgeBase) => (
              <article className="action-card" key={knowledgeBase.id}>
                <div className="action-icon">
                  <Database size={20} />
                </div>

                <div className="action-copy">
                  <h3>{knowledgeBase.name}</h3>
                  <p>Knowledge base ID: {knowledgeBase.id}</p>
                  <p>Created {formatDate(knowledgeBase.created_at)}</p>
                </div>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => handleDelete(knowledgeBase)}
                  disabled={deletingId !== null || creating}
                  title="Delete this knowledge base"
                >
                  <Trash2 size={16} />
                  {deletingId === knowledgeBase.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
