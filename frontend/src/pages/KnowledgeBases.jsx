
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { getKnowledgeBases } from "../services/api";

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

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h2>Your knowledge bases</h2>
          <p>
            Browse the collections available in your DeepDoc AI workspace.
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
          <p>
            Your collections will appear here once they are available in the
            backend.
          </p>
        </div>
      ) : !error ? (
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
              <article
                className="action-card"
                key={knowledgeBase.id}
              >
                <div className="action-icon">
                  <Database size={20} />
                </div>

                <div className="action-copy">
                  <h3>{knowledgeBase.name}</h3>
                  <p>Knowledge base ID: {knowledgeBase.id}</p>
                  <p>Created {formatDate(knowledgeBase.created_at)}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
