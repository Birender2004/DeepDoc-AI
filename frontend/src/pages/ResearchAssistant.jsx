
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  BookOpen,
  Bot,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import {
  getDocuments,
  getKnowledgeBases,
  queryDocuments,
} from "../services/api";

const suggestions = [
  "What is this document about?",
  "Summarize the main findings.",
  "What are the key concepts discussed?",
];

export default function ResearchAssistant() {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      const [bases, docs] = await Promise.all([
        getKnowledgeBases(),
        getDocuments(),
      ]);

      if (!Array.isArray(bases) || !Array.isArray(docs)) {
        throw new Error("The backend returned an unexpected response.");
      }

      setKnowledgeBases(bases);
      setDocuments(docs);

      setKnowledgeBaseId((current) => {
        if (current && bases.some((base) => String(base.id) === current)) {
          return current;
        }

        return bases.length ? String(bases[0].id) : "";
      });
    } catch (err) {
      setError(err.message || "Failed to load research data.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableDocuments = documents.filter(
    (document) =>
      String(document.knowledge_base_id) === String(knowledgeBaseId)
  );

  async function handleAsk(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Enter a question before submitting.");
      return;
    }

    if (!knowledgeBaseId) {
      setError("Select a knowledge base first.");
      return;
    }

    setError("");
    setAsking(true);

    try {
      const result = await queryDocuments(
        trimmedQuestion,
        knowledgeBaseId,
        documentId || null
      );

      const entry = {
        id: `${Date.now()}`,
        question: trimmedQuestion,
        answer: result.answer || "The backend returned an empty answer.",
        sources: Array.isArray(result.sources) ? result.sources : [],
      };

      setAnswer(entry);
      setHistory((current) => [entry, ...current]);
      setQuestion("");
    } catch (err) {
      setError(err.message || "Failed to get an answer.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="research-layout">
      <section className="research-workspace">
        <div className="research-intro">
          <div className="research-intro-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h2>Ask your documents</h2>
            <p>Get answers grounded in your indexed research documents.</p>
          </div>
        </div>

        <div className="research-filters">
          <label className="research-field">
            <span>Knowledge base</span>
            <select
              value={knowledgeBaseId}
              onChange={(event) => {
                setKnowledgeBaseId(event.target.value);
                setDocumentId("");
                setAnswer(null);
                setError("");
              }}
              disabled={loadingData || asking}
            >
              {knowledgeBases.length === 0 && (
                <option value="">No knowledge bases available</option>
              )}
              {knowledgeBases.map((base) => (
                <option key={base.id} value={String(base.id)}>
                  {base.name}
                </option>
              ))}
            </select>
          </label>

          <label className="research-field">
            <span>Document scope</span>
            <select
              value={documentId}
              onChange={(event) => {
                setDocumentId(event.target.value);
                setAnswer(null);
              }}
              disabled={loadingData || asking || !knowledgeBaseId}
            >
              <option value="">All documents in this knowledge base</option>
              {availableDocuments.map((document) => (
                <option key={document.id} value={document.document_id}>
                  {document.filename}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loadingData ? (
          <div className="research-state">
            <LoaderCircle className="spin" size={23} />
            <p>Loading your research workspace...</p>
          </div>
        ) : (
          <>
            {!answer && (
              <div className="research-empty">
                <div className="research-empty-icon">
                  <Bot size={32} />
                </div>
                <h3>What would you like to discover?</h3>
                <p>
                  Ask a question about your documents to begin your research.
                </p>
                <div className="suggestion-list">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => setQuestion(suggestion)}
                      disabled={asking}
                    >
                      <MessageSquareText size={15} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {answer && (
              <div className="answer-panel">
                <div className="question-bubble">
                  <span className="question-label">YOUR QUESTION</span>
                  <p>{answer.question}</p>
                </div>

                <div className="answer-heading">
                  <div className="answer-icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3>Research answer</h3>
                    <p>Generated from your selected research scope</p>
                  </div>
                </div>

                <div className="answer-content">
                  <ReactMarkdown>{answer.answer}</ReactMarkdown>
                </div>

                <div className="sources-section">
                  <h4>
                    <BookOpen size={17} />
                    Sources ({answer.sources.length})
                  </h4>

                  {answer.sources.length === 0 ? (
                    <p className="sources-empty">
                      The API returned no source references for this answer.
                    </p>
                  ) : (
                    <div className="source-list">
                      {answer.sources.map((source, index) => (
                        <article
                          className="source-card"
                          key={`${source.document_id}-${source.page ?? index}`}
                        >
                          <div className="source-file-icon">
                            <FileText size={17} />
                          </div>
                          <div className="source-copy">
                            <strong>
                              {source.filename || "Source document"}
                            </strong>
                            <p>
                              {source.page !== null &&
                              source.page !== undefined
                                ? `Page ${source.page}`
                                : "Page not provided"}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="upload-message upload-message-error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button
              type="button"
              className="document-action-button"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}

        <form className="research-composer" onSubmit={handleAsk}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything about your documents..."
            rows={3}
            disabled={asking || loadingData || !knowledgeBaseId}
          />
          <div className="composer-footer">
            <span>
              {documentId
                ? "Searching the selected document"
                : "Searching the selected knowledge base"}
            </span>
            <button
              className="button-primary"
              type="submit"
              disabled={asking || loadingData || !knowledgeBaseId}
            >
              {asking ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {asking ? "Researching..." : "Ask question"}
            </button>
          </div>
        </form>
      </section>

      <aside className="research-history">
        <div className="history-heading">
          <MessageSquareText size={18} />
          <h3>Recent questions</h3>
        </div>

        {history.length === 0 ? (
          <div className="history-empty">
            <p>Your questions will appear here during this session.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <button
                className="history-item"
                key={item.id}
                type="button"
                onClick={() => setAnswer(item)}
              >
                <MessageSquareText size={15} />
                <span>{item.question}</span>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
