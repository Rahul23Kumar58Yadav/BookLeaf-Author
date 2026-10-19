import { useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useClickOutside } from "../../hooks/useClickOutside";
import { Badge, Button, Icon } from "../common";
import { titleFor } from "./navConfig";
import "./Topbar.css";

export function Topbar({ onMenu, menuOpen }) {
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(menuRef, close, open);

  const initials = (user?.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="topbar">
      <Button
        variant="ghost" size="icon" className="topbar__menu" onClick={onMenu}
        aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="app-nav"
      >
        <Icon name="menu" />
      </Button>

      <h1 className="topbar__title">{titleFor(user?.role, pathname)}</h1>

      <div className="topbar__actions">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}>
          <Icon name={resolved === "dark" ? "sun" : "moon"} />
        </Button>

        <div className="usermenu" ref={menuRef}>
          <button className="usermenu__trigger" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
            <span className="usermenu__avatar" aria-hidden="true">{initials}</span>
            <span className="usermenu__name">{user?.name}</span>
            <Icon name="chevron" size={16} />
          </button>

          {open && (
            <div className="usermenu__panel" role="menu">
              <div className="usermenu__who">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <Badge tone={user?.role === "admin" ? "info" : "neutral"}>{user?.role}</Badge>
              </div>
              <button role="menuitem" className="usermenu__item" onClick={logout}>
                <Icon name="logout" size={18} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}