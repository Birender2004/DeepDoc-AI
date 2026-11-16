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

  ShieldCheck,

  ShieldAlert,

  Sparkles,

  Wrench,

} from "lucide-react";

import {

  agentResearch,

  getDocuments,

  getKnowledgeBases,

  queryDocuments,

} from "../services/api";

function formatToolName(name) {
  const labels = {
    verified_research: "Verified Research",
    search_knowledge_base: "Search Knowledge Base",
    search_document: "Search Document",
    compare_documents: "Compare Documents",
  };

  return labels[name] || String(name)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const suggestions = [

  "What is this document about?",

  "Summarize the main findings.",

  "What are the key concepts discussed?",

];

function VerificationPanel({ answer }) {

  if (!answer.verificationVerdict) return null;

  const supported =

    answer.verificationVerdict.toUpperCase() === "SUPPORTED";

  return (

    <section className="verification-panel">

      <div className="answer-heading">

        {supported ? (

          <ShieldCheck size={20} />

        ) : (

          <ShieldAlert size={20} />

        )}

        <div>

          <h4>Answer verification</h4>

          <p>

            Verdict: <strong>{answer.verificationVerdict}</strong>

          </p>

        </div>

      </div>

      <div className="verification-indicators">

        <span>Grounded: {answer.grounded ? "Yes" : "No"}</span>

        <span>

          Citations valid: {answer.citationsValid ? "Yes" : "No"}

        </span>

      </div>

      {answer.verificationExplanation && (

        <p className="verification-explanation">

          {answer.verificationExplanation}

        </p>

      )}

      {answer.unsupportedClaims?.length > 0 && (

        <div className="unsupported-claims">

          <strong>Potentially unsupported claims</strong>

          <ul>

            {answer.unsupportedClaims.map((claim, index) => (

              <li key={`${index}-${claim}`}>{claim}</li>

            ))}

          </ul>

        </div>

      )}

      <p className="verification-disclaimer">

        Verification is an automated assessment, not a guarantee that every

        statement is correct.

      </p>

    </section>

  );

}

function AgentToolsPanel({ answer }) {

  if (!answer.agentic || answer.toolsUsed.length === 0) return null;

  return (

    <section className="verification-panel">

      <div className="answer-heading">

        <Wrench size={19} />

        <div>

          <h4>Agent activity</h4>

          <p>The agent selected these tools during its research.</p>

        </div>

      </div>

      <div className="verification-indicators">

        {answer.toolsUsed.map((toolName) => (

          <span key={toolName}>{toolName}</span>

        ))}

      </div>

      {answer.toolCalls.length > 0 && (

        <details className="source-excerpt">

          <summary>

            View tool-call details ({answer.toolCalls.length})

          </summary>

          <div>

            {answer.toolCalls.map((call, index) => (

              <article

                className="source-card"

                key={`${call.name}-${index}`}

              >

                <div className="source-file-icon">

                  <Wrench size={16} />

                </div>

                <div className="source-copy">

                  <strong>{call.name}</strong>

                  <pre className="agent-tool-arguments">

                    {JSON.stringify(call.args || {}, null, 2)}

                  </pre>

                </div>

              </article>

            ))}

          </div>

        </details>

      )}

      <p className="verification-disclaimer">

        Tool activity shows how the agent conducted its research. It does not

        independently establish that the final answer is correct.

      </p>

    </section>

  );

}

function SourcesPanel({ sources, agentic }) {

  return (

    <div className="sources-section">

      <h4>

        <BookOpen size={17} />

        Sources ({sources.length})

      </h4>

      {sources.length === 0 ? (

        <p className="sources-empty">

          {agentic

            ? "No structured source evidence was returned by the agent."

            : "The API returned no source references for this answer."}

        </p>

      ) : (

        <div className="source-list">

          {sources.map((source, index) => (

            <article

              className="source-card"

              key={`${source.document_id || source.filename}-${source.page ?? index}-${source.citation_index ?? index}`}

            >

              <div className="source-file-icon">

                <FileText size={17} />

              </div>

              <div className="source-copy">

                <strong>

                  {source.citation_index

                    ? `[${source.citation_index}] `

                    : ""}

                  {source.filename || "Source document"}

                </strong>

                <p>

                  {source.page !== null && source.page !== undefined

                    ? `Page ${source.page}`

                    : "Page not provided"}

                </p>

                {source.document_id && (

                  <p className="source-excerpt-unavailable">

                    Document ID: {source.document_id}

                  </p>

                )}

                {source.excerpt ? (

                  <details className="source-excerpt">

                    <summary>View evidence excerpt</summary>

                    <p>{source.excerpt}</p>

                  </details>

                ) : (

                  <p className="source-excerpt-unavailable">

                    Evidence excerpt not provided by this endpoint.

                  </p>

                )}

              </div>

            </article>

          ))}

        </div>

      )}

    </div>

  );

}

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

      const isAgenticResearch = !documentId;

      const result = isAgenticResearch

        ? await agentResearch(trimmedQuestion, knowledgeBaseId)

        : await queryDocuments(

            trimmedQuestion,

            knowledgeBaseId,

            documentId

          );

      const toolCalls = Array.isArray(result.tool_calls)

        ? result.tool_calls

        : [];

      const toolsUsed = Array.isArray(result.tools_used)

        ? result.tools_used

        : [];

      const entry = {

        id: `${Date.now()}`,

        question: trimmedQuestion,

        answer: result.answer || "The backend returned an empty answer.",

        sources: Array.isArray(result.sources) ? result.sources : [],

        retrievalMode: result.retrieval_mode || null,

        verificationVerdict: result.verification_verdict || null,

        grounded:

          typeof result.grounded === "boolean" ? result.grounded : null,

        citationsValid:

          typeof result.citations_valid === "boolean"

            ? result.citations_valid

            : null,

        unsupportedClaims: Array.isArray(result.unsupported_claims)

          ? result.unsupported_claims

          : [],

        verificationExplanation: result.verification_explanation || "",

        agentic: isAgenticResearch,

        toolCalls,

        toolsUsed: [...new Set(toolsUsed)],

        scope: isAgenticResearch ? "Agentic research" : "Selected document",

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
      <style>{`
        .research-layout {
          --ra-border: rgba(167, 139, 250, 0.18);
          --ra-surface: rgba(255, 255, 255, 0.025);
          --ra-muted: #a7a1c5;
          min-width: 0;
        }
        .research-layout .answer-panel {
          min-width: 0;
        }
        .research-layout .question-bubble {
          padding: 20px 22px;
          border: 1px solid var(--ra-border);
          border-radius: 18px;
          background: rgba(139, 92, 246, 0.075);
          margin-bottom: 24px;
        }
        .research-layout .question-label {
          display: block;
          margin-bottom: 10px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #b9a7ff;
        }
        .research-layout .question-bubble p {
          margin: 0;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }
        .research-layout .answer-heading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 22px 0 16px;
        }
        .research-layout .answer-heading h3,
        .research-layout .answer-heading h4 {
          margin: 0 0 5px;
          line-height: 1.35;
        }
        .research-layout .answer-heading p {
          margin: 0;
          color: var(--ra-muted);
          line-height: 1.5;
        }
        .research-layout .answer-content {
          font-size: 0.98rem;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }
        .research-layout .answer-content > :first-child {
          margin-top: 0;
        }
        .research-layout .answer-content > :last-child {
          margin-bottom: 0;
        }
        .research-layout .answer-content h1,
        .research-layout .answer-content h2,
        .research-layout .answer-content h3,
        .research-layout .answer-content h4 {
          margin: 1.5em 0 0.65em;
          line-height: 1.35;
        }
        .research-layout .answer-content p {
          margin: 0 0 1em;
        }
        .research-layout .answer-content ul,
        .research-layout .answer-content ol {
          padding-left: 1.5rem;
          margin: 0.6em 0 1.1em;
        }
        .research-layout .answer-content li {
          padding-left: 0.25rem;
          margin: 0.35em 0;
        }
        .research-layout .answer-content blockquote {
          margin: 1rem 0;
          padding: 0.25rem 1rem;
          border-left: 3px solid #8b5cf6;
          color: #c7c1df;
          background: var(--ra-surface);
          border-radius: 0 10px 10px 0;
        }
        .research-layout .verification-panel {
          min-width: 0;
          margin-top: 22px;
          padding: 20px;
          border: 1px solid var(--ra-border);
          border-radius: 16px;
          background: var(--ra-surface);
        }
        .research-layout .verification-indicators {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          margin: 14px 0;
        }
        .research-layout .verification-indicators > span,
        .research-layout .ra-tool-badge {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          max-width: 100%;
          padding: 7px 11px;
          border: 1px solid var(--ra-border);
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.09);
          color: #d8ccff;
          font-size: 0.82rem;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .research-layout .ra-tool-badge {
          font-weight: 600;
        }
        .research-layout .verification-disclaimer,
        .research-layout .verification-explanation {
          color: var(--ra-muted);
          font-size: 0.84rem;
          line-height: 1.6;
        }
        .research-layout .source-list {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
        }
        .research-layout .source-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
          padding: 16px;
          border: 1px solid var(--ra-border);
          border-radius: 14px;
          background: var(--ra-surface);
        }
        .research-layout .source-file-icon {
          display: flex;
          flex: 0 0 40px;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(139, 92, 246, 0.13);
          color: #c4b5fd;
        }
        .research-layout .source-copy {
          flex: 1;
          min-width: 0;
        }
        .research-layout .source-copy > strong {
          display: block;
          margin: 1px 0 7px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .research-layout .source-copy > p {
          margin: 5px 0;
          color: var(--ra-muted);
          font-size: 0.82rem;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }
        .research-layout .source-excerpt {
          margin-top: 10px;
          border: 1px solid var(--ra-border);
          border-radius: 10px;
          overflow: hidden;
        }
        .research-layout .source-excerpt summary {
          padding: 10px 12px;
          cursor: pointer;
          color: #c4b5fd;
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1.5;
        }
        .research-layout .source-excerpt > p,
        .research-layout .source-excerpt > div {
          margin: 0;
          padding: 12px;
          border-top: 1px solid var(--ra-border);
          line-height: 1.7;
          overflow-wrap: anywhere;
        }
        .research-layout .agent-tool-arguments {
          max-width: 100%;
          margin: 10px 0 0;
          padding: 12px;
          border: 1px solid var(--ra-border);
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.18);
          font-size: 0.8rem;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          overflow-x: auto;
        }
        .research-layout .sources-section {
          margin-top: 26px;
          padding-top: 20px;
          border-top: 1px solid var(--ra-border);
        }
        .research-layout .sources-section > h4 {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 14px;
        }
        .research-layout .sources-empty {
          padding: 14px 16px;
          border: 1px dashed var(--ra-border);
          border-radius: 12px;
          color: var(--ra-muted);
          line-height: 1.6;
        }
        .research-layout .retrieval-mode {
          margin-top: 16px;
          color: var(--ra-muted);
          font-size: 0.82rem;
        }
        .research-layout .history-item {
          min-width: 0;
        }
        .research-layout .history-item span {
          overflow-wrap: anywhere;
        }
        @media (min-width: 900px) {
          .research-layout .source-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .research-layout .verification-panel {
            padding: 15px;
          }
          .research-layout .source-card {
            gap: 10px;
            padding: 12px;
          }
          .research-layout .source-file-icon {
            flex-basis: 34px;
            width: 34px;
            height: 34px;
          }
          .research-layout .question-bubble {
            padding: 16px;
          }
        }
      `}</style>

      <section className="research-workspace">

        <div className="research-intro">

          <div className="research-intro-icon">

            <Sparkles size={22} />

          </div>

          <div>

            <h2>Ask your documents</h2>

            <p>

              Explore your documents using an agentic research workflow or

              ask questions about an individual PDF.

            </p>

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

                setError("");

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

        {!documentId && (

          <p className="research-scope-note">

            <Bot size={15} />

            Agentic mode: the agent can choose and invoke research tools.

          </p>

        )}

        {documentId && (

          <p className="research-scope-note">

            <FileText size={15} />

            Document-specific questions use the existing query endpoint.

          </p>

        )}

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

                    {answer.agentic ? (

                      <Bot size={18} />

                    ) : (

                      <Sparkles size={18} />

                    )}

                  </div>

                  <div>

                    <h3>

                      {answer.agentic

                        ? "Agentic research answer"

                        : "Document answer"}

                    </h3>

                    <p>Scope: {answer.scope}</p>

                  </div>

                </div>

                <div className="answer-content">

                  <ReactMarkdown>{answer.answer}</ReactMarkdown>

                </div>

                <AgentToolsPanel answer={answer} />

                <VerificationPanel answer={answer} />

                {answer.retrievalMode && (

                  <p className="retrieval-mode">

                    Retrieval mode: {answer.retrievalMode.replaceAll("_", " ")}

                  </p>

                )}

                <SourcesPanel

                  sources={answer.sources}

                  agentic={answer.agentic}

                />

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

                : "Agentic research across the selected knowledge base"}

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

                onClick={() => {

                  setAnswer(item);

                  setError("");

                }}

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