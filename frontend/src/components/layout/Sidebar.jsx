import { NavLink } from "react-router-dom";
import {
  BrainCircuit,
  ChevronLeft,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Documents", path: "/documents", icon: FileText },
  { label: "Knowledge Bases", path: "/knowledge-bases", icon: Database },
  { label: "Research Assistant", path: "/research", icon: MessageSquareText },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-icon">
          <BrainCircuit size={23} />
        </div>

        <div className="brand-copy">
          <span className="brand-name">DeepDoc AI</span>
          <span className="brand-caption">DOCUMENT INTELLIGENCE</span>
        </div>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      </div>

      <div className="workspace-label">WORKSPACE</div>

      <nav className="sidebar-nav">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            title={collapsed ? label : undefined}
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
        <div className="sidebar-status" title={collapsed ? "Workspace ready — Local development" : undefined}>
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