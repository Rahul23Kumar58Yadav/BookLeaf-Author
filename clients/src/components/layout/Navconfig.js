/** Single source of truth for navigation: Sidebar renders it, Topbar reads titles from it. */
export const NAV = {
  author: [
    { to: "/books",       label: "My books",      icon: "book",   title: "My books" },
    { to: "/tickets/new", label: "Ask for help",  icon: "plus",   title: "Submit a support query" },
    {
      to: "/tickets", label: "My tickets", icon: "ticket", title: "My tickets",
      // Active on the list and on /tickets/:id, but not on /tickets/new (that has its own entry)
      isActive: (p) => p === "/tickets" || /^\/tickets\/(?!new$)[^/]+$/.test(p),
    },
  ],
  admin: [
    { to: "/admin/tickets", label: "Ticket queue", icon: "inbox", title: "Ticket queue" },
  ],
};

export const homeFor = (role) => (role === "admin" ? "/admin/tickets" : "/books");

/** Longest-prefix match so /tickets/123 still resolves to "My tickets". */
export function titleFor(role, pathname) {
  const items = [...(NAV[role] ?? [])].sort((a, b) => b.to.length - a.to.length);
  return items.find((i) => pathname === i.to || pathname.startsWith(i.to + "/"))?.title ?? "BookLeaf Support";
}