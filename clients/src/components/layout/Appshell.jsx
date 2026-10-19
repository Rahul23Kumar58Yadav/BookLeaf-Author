import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PageSpinner } from "../common";
import "./AppShell.css";

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer after navigating
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="shell" data-nav-open={navOpen || undefined}>
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar onNavigate={() => setNavOpen(false)} />
      {/* Scrim is a real button so the drawer is dismissible by keyboard and touch */}
      <button className="shell__scrim" tabIndex={-1} aria-label="Close menu" onClick={() => setNavOpen(false)} />
      <Topbar onMenu={() => setNavOpen((o) => !o)} menuOpen={navOpen} />
      <main id="main" className="shell__main" tabIndex={-1}>
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}