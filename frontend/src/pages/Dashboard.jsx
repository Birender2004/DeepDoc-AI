import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Database,
  FileText,
  MessageSquareText,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDocuments, getKnowledgeBases } from "../services/api";

const actions = [
  {
    title: "Upload a document",
    description: "Add a PDF to your research workspace.",
    path: "/documents",
    icon: Upload,
  },
  {
    title: "Explore knowledge bases",
    description: "Organize and browse your collections.",
    path: "/knowledge-bases",
    icon: Database,
  },
  {
    title: "Ask your documents",
    description: "Get answers grounded in your research.",
    path: "/research",
    icon: MessageSquareText,
  },
];

function getList(result, keys = []) {
  if (Array.isArray(result)) return result;

  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key];
  }

  return [];
}

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [documentsResult, knowledgeBasesResult] = await Promise.all([
        getDocuments(),
        getKnowledgeBases(),
      ]);

      setDocuments(
        getList(documentsResult, ["documents", "items", "data"]),
      );

      setKnowledgeBases(
        getList(knowledgeBasesResult, [
          "knowledge_bases",
          "knowledgeBases",
          "items",
          "data",
        ]),
      );
    } catch (err) {
      setError(err.message || "Unable to load workspace statistics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const indexedDocuments = documents.filter(
    (document) => document.status?.toLowerCase() === "indexed",
  ).length;

  const metrics = [
    {
      label: "Total documents",
      value: documents.length,
      note: "Documents in your workspace",
      icon: FileText,
      tone: "violet",
    },
    {
      label: "Knowledge bases",
      value: knowledgeBases.length,
      note: "Your research collections",
      icon: Database,
      tone: "blue",
    },
    {
      label: "Indexed documents",
      value: indexedDocuments,
      note: "Ready for semantic search",
      icon: Sparkles,
      tone: "green",
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="welcome-banner">
        <div className="welcome-glow welcome-glow-one" />
        <div className="welcome-glow welcome-glow-two" />

        <div className="welcome-content">
          <div className="eyebrow">
            <Sparkles size={14} /> YOUR AI RESEARCH WORKSPACE
          </div>

          <h2>
            Turn documents into <span>knowledge.</span>
          </h2>

          <p>
            Search your research, discover insights, and get
            evidence-grounded answers from your documents.
          </p>

          <div className="welcome-actions">
            <Link to="/research" className="button-primary">
              <MessageSquareText size={17} />
              Start researching
              <ArrowRight size={16} />
            </Link>

            <Link to="/documents" className="button-secondary">
              <Plus size={17} />
              Add documents
            </Link>
          </div>
        </div>

        <div className="welcome-illustration">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <div className="illustration-core">
            <Bot size={42} strokeWidth={1.3} />
          </div>

          <div className="float-card float-card-one">
            <FileText size={16} />
            <span>Research PDFs</span>
          </div>

          <div className="float-card float-card-two">
            <Sparkles size={16} />
            <span>AI insights</span>
          </div>

          <div className="float-card float-card-three">
            <Database size={16} />
            <span>Vector search</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Workspace overview</h2>
            <p>Your document intelligence at a glance.</p>
          </div>

          <button
            type="button"
            className="button-secondary"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={15} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "10px",
              color: "#ffb4b4",
              background: "rgba(255, 80, 80, 0.10)",
              border: "1px solid rgba(255, 80, 80, 0.25)",
            }}
          >
            {error}
          </div>
        )}

        <div className="metrics-grid">
          {metrics.map(({ label, value, note, icon: Icon, tone }) => (
            <article className="metric-card" key={label}>
              <div className={`metric-icon ${tone}`}>
                <Icon size={20} />
              </div>

              <div className="metric-label">{label}</div>

              <div className="metric-value">
                {loading ? "…" : value}
              </div>

              <div className="metric-note">{note}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Quick actions</h2>
            <p>Pick up where your research begins.</p>
          </div>
        </div>

        <div className="actions-grid">
          {actions.map(({ title, description, path, icon: Icon }) => (
            <Link className="action-card" to={path} key={title}>
              <div className="action-icon">
                <Icon size={20} />
              </div>

              <div className="action-copy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>

              <ArrowUpRight className="action-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="tip-banner">
        <div className="tip-icon">
          <Sparkles size={19} />
        </div>

        <div>
          <strong>Research grounded in evidence</strong>
          <p>
            DeepDoc AI retrieves relevant passages from your documents
            to help generate context-aware answers.
          </p>
        </div>

        <Link to="/research" className="tip-link">
          Try it <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
