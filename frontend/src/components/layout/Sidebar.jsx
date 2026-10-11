import { NavLink } from "react-router-dom";
import {
  BrainCircuit,
  ChevronLeft,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Documents", path: "/documents", icon: FileText },
  { label: "Knowledge Bases", path: "/knowledge-bases", icon: Database },
  { label: "Research Assistant", path: "/research", icon: MessageSquareText },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <BrainCircuit size={23} />
        </div>
        <div className="brand-copy">
          <span className="brand-name">DeepDoc AI</span>
          <span className="brand-caption">DOCUMENT INTELLIGENCE</span>
        </div>
        <PanelLeftClose className="sidebar-toggle" size={19} />
      </div>

      <div className="workspace-label">WORKSPACE</div>

      <nav className="sidebar-nav">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `nav-link${isActive ? " active" : ""}`
            }
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
            {label === "Research Assistant" && (
              <span className="nav-new">AI</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-status">
          <span className="status-dot" />
          <div>
            <div className="status-title">Workspace ready</div>
            <div className="status-caption">Local development</div>
          </div>
          <ChevronLeft size={16} />
        </div>
        <div className="sidebar-footer">DEEPDOC AI · RESEARCH WORKSPACE</div>
      </div>
    </aside>
  );
}