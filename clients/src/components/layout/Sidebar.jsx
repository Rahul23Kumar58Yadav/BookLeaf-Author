import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Icon } from "../common";
import { NAV } from "./navConfig";
import "./Sidebar.css";

export function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const items = NAV[user?.role] ?? [];
  const { pathname } = useLocation();

  return (
    <aside className="sidebar" id="app-nav">
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true" />
        <div>
          <strong>BookLeaf</strong>
          <small>{user?.role === "admin" ? "Operations" : "Author support"}</small>
        </div>
      </div>

      <nav aria-label="Main">
        <ul>
          {items.map(({ to, label, icon, end, isActive }) => (
            <li key={to}>
              {isActive ? (
                // Custom active rule: render a plain Link and set the state ourselves
                <Link
                  to={to} onClick={onNavigate}
                  className={`sidebar__link${isActive(pathname) ? " active" : ""}`}
                  aria-current={isActive(pathname) ? "page" : undefined}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                </Link>
              ) : (
                <NavLink to={to} end={end} onClick={onNavigate} className="sidebar__link">
                  <Icon name={icon} />
                  <span>{label}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}