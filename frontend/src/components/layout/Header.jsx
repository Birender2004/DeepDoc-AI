import { Bell, ChevronDown, Search, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageDetails = {
  "/": { title: "Dashboard", subtitle: "Your research workspace at a glance." },
  "/documents": { title: "Documents", subtitle: "Manage and organize your research files." },
  "/knowledge-bases": { title: "Knowledge Bases", subtitle: "Organize documents into searchable collections." },
  "/research": { title: "Research Assistant", subtitle: "Ask questions and explore your documents." },
};

export default function Header() {
  const location = useLocation();
  const page = pageDetails[location.pathname] || pageDetails["/"];

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span className="breadcrumb-muted">DeepDoc AI</span>
        <span className="breadcrumb-separator">/</span>
        <span>{page.title}</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-button search-button" aria-label="Search">
          <Search size={18} />
        </button>
        <button className="icon-button notification-button" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <div className="topbar-divider" />
        <button className="profile-button">
          <span className="profile-avatar"><Sparkles size={17} /></span>
          <span className="profile-name">Researcher</span>
          <ChevronDown size={15} />
        </button>
      </div>

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