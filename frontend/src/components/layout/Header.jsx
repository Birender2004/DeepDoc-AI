import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Search,
  Sparkles,
  X,
  FileText,
  Database,
  LayoutDashboard,
  MessageSquareText,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDocuments, getKnowledgeBases } from "../../services/api";

const pageDetails = {
  "/": { title: "Dashboard", subtitle: "Your research workspace at a glance." },
  "/documents": { title: "Documents", subtitle: "Manage and organize your research files." },
  "/knowledge-bases": { title: "Knowledge Bases", subtitle: "Organize documents into searchable collections." },
  "/research": { title: "Research Assistant", subtitle: "Ask questions and explore your documents." },
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageDetails[location.pathname] || pageDetails["/"];
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    let cancelled = false;

    async function loadSearchData() {
      setSearchLoading(true);
      setSearchError("");

      try {
        const [documentData, knowledgeBaseData] = await Promise.all([
          getDocuments(),
          getKnowledgeBases(),
        ]);

        if (!cancelled) {
          setDocuments(Array.isArray(documentData) ? documentData : documentData?.documents || []);
          setKnowledgeBases(Array.isArray(knowledgeBaseData) ? knowledgeBaseData : knowledgeBaseData?.knowledge_bases || []);
        }
      } catch (error) {
        if (!cancelled) setSearchError(error.message || "Could not load search results.");
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    loadSearchData();

    return () => {
      cancelled = true;
    };
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchTerm("");
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const term = searchTerm.trim().toLowerCase();

  const matchingDocuments = documents.filter((document) =>
    (document.filename || "").toLowerCase().includes(term)
  );

  const matchingKnowledgeBases = knowledgeBases.filter((knowledgeBase) =>
    (knowledgeBase.name || "").toLowerCase().includes(term)
  );

  function openSearchResult(path) {
    setSearchOpen(false);
    setSearchTerm("");
    navigate(path);
  }

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span className="breadcrumb-muted">DeepDoc AI</span>
        <span className="breadcrumb-separator">/</span>
        <span>{page.title}</span>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button search-button"
          aria-label="Search"
          title="Search documents and knowledge bases"
          onClick={() => {
            setSearchOpen((open) => !open);
            setNotificationsOpen(false);
            setProfileOpen(false);
          }}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>

        <button
          type="button"
          className="icon-button notification-button"
          aria-label="Notifications"
          title="Notifications"
          aria-expanded={notificationsOpen}
          onClick={() => {
            setNotificationsOpen((open) => !open);
            setSearchOpen(false);
            setProfileOpen(false);
          }}
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <div className="topbar-divider" />

        <button
          type="button"
          className="profile-button"
          aria-expanded={profileOpen}
          onClick={() => {
            setProfileOpen((open) => !open);
            setSearchOpen(false);
            setNotificationsOpen(false);
          }}
        >
          <span className="profile-avatar"><Sparkles size={17} /></span>
          <span className="profile-name">Researcher</span>
          <ChevronDown size={15} />
        </button>
      </div>

      {searchOpen && (
        <div className="header-popover global-search-panel">
          <label className="global-search-input">
            <Search size={17} />
            <input
              ref={searchRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search documents and knowledge bases..."
              aria-label="Search documents and knowledge bases"
            />
            <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear search">
              <X size={15} />
            </button>
          </label>

          {searchLoading && <p className="popover-message">Loading search data...</p>}
          {searchError && <p className="popover-error">{searchError}</p>}

          {!searchLoading && !searchError && !term && (
            <p className="popover-message">Type to search your documents and knowledge bases.</p>
          )}

          {!searchLoading && term && (
            <div className="global-search-results">
              <div className="popover-section-label">Documents</div>
              {matchingDocuments.slice(0, 6).map((document) => (
                <button
                  type="button"
                  className="popover-result"
                  key={document.document_id || document.id || document.filename}
                  onClick={() => openSearchResult("/documents")}
                >
                  <FileText size={16} />
                  <span>{document.filename || "Untitled document"}</span>
                </button>
              ))}
              {matchingDocuments.length === 0 && (
                <p className="popover-message">No matching documents.</p>
              )}

              <div className="popover-section-label">Knowledge Bases</div>
              {matchingKnowledgeBases.slice(0, 6).map((knowledgeBase) => (
                <button
                  type="button"
                  className="popover-result"
                  key={knowledgeBase.id}
                  onClick={() => openSearchResult("/knowledge-bases")}
                >
                  <Database size={16} />
                  <span>{knowledgeBase.name}</span>
                </button>
              ))}
              {matchingKnowledgeBases.length === 0 && (
                <p className="popover-message">No matching knowledge bases.</p>
              )}

              <button
                type="button"
                className="popover-result popover-view-all"
                onClick={() => openSearchResult("/documents")}
              >
                <LayoutDashboard size={16} />
                <span>Open Documents</span>
              </button>
            </div>
          )}
        </div>
      )}

      {notificationsOpen && (
        <div className="header-popover notification-panel">
          <div className="popover-heading">Notifications</div>
          <div className="notification-item">
            <span className="notification-item-icon"><Sparkles size={16} /></span>
            <div>
              <strong>Workspace ready</strong>
              <p>DeepDoc AI is ready for your research.</p>
            </div>
          </div>
          <div className="notification-item">
            <span className="notification-item-icon"><FileText size={16} /></span>
            <div>
              <strong>Document management</strong>
              <p>Upload, index, and manage PDFs from Documents.</p>
            </div>
          </div>
          <button
            type="button"
            className="popover-action"
            onClick={() => {
              setNotificationsOpen(false);
              navigate("/documents");
            }}
          >
            <FileText size={15} /> Open Documents
          </button>
        </div>
      )}

      {profileOpen && (
        <div className="header-popover profile-menu">
          <div className="profile-menu-heading">
            <span className="profile-avatar"><Sparkles size={17} /></span>
            <div>
              <strong>Researcher</strong>
              <p>DeepDoc AI workspace</p>
            </div>
          </div>
          <button type="button" className="popover-result" onClick={() => openSearchResult("/research")}>
            <MessageSquareText size={16} />
            <span>Open Research Assistant</span>
          </button>
          <button type="button" className="popover-result" onClick={() => openSearchResult("/knowledge-bases")}>
            <Database size={16} />
            <span>Manage Knowledge Bases</span>
          </button>
          <button type="button" className="popover-result" onClick={() => openSearchResult("/")}>
            <LayoutDashboard size={16} />
            <span>Go to Dashboard</span>
          </button>
        </div>
      )}

      <div className="page-heading">
        <div>
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
        </div>
        <div className="environment-badge">
          <span className="status-dot" />
          Development
        </div>
      </div>
    </header>
  );
}