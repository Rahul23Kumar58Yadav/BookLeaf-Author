import { useMemo } from "react";
import { useFreshIds } from "../../hooks/useFreshIds";
import { Icon } from "../common";
import { formatDateTime, formatRelative } from "../../utils/format";
import "./TicketThread.css";

/**
 * One conversation view for both portals.
 *
 * ticket: {
 *   description, createdAt, status, author: { name },
 *   messages: [{ id, senderRole: "author"|"admin", senderName, body, createdAt }],
 *   notes?:   [{ id, body, createdAt, adminName }]     // internal; the API only sends these to admins
 * }
 * viewer: "author" | "admin". Notes render only for admins (and the API never sends them to authors anyway).
 * children: slot below the thread, e.g. the admin's reply editor.
 */
export function TicketThread({ ticket, viewer = "author", children }) {
  const items = useMemo(() => buildItems(ticket, viewer), [ticket, viewer]);
  const fresh = useFreshIds(items.map((i) => i.id));

  return (
    <section className="thread" aria-label="Conversation">
      <ol className="thread__list" role="log" aria-live="polite" aria-relevant="additions">
        {items.map((m) => (
          <Message key={m.id} item={m} viewer={viewer} isNew={fresh.has(m.id)} />
        ))}
      </ol>

      {viewer === "author" && ticket.messages.length === 0 && (
        <p className="thread__waiting">
          Your query is in the queue. Replies from the team will appear here as soon as they're sent.
        </p>
      )}

      {ticket.status === "closed" && (
        <p className="thread__closed">
          <Icon name="lock" size={16} />{" "}
          {viewer === "admin"
            ? "This ticket is closed. Change its status to reopen it."
            : "This ticket is closed. If you still need help, start a new query."}
        </p>
      )}

      {children}
    </section>
  );
}

function buildItems(ticket, viewer) {
  const original = {
    id: "original", kind: "message", senderRole: "author",
    senderName: ticket.author?.name ?? "Author", body: ticket.description, createdAt: ticket.createdAt,
  };
  const messages = ticket.messages.map((m) => ({ ...m, kind: "message" }));
  const notes = viewer === "admin" ? (ticket.notes ?? []).map((n) => ({ ...n, kind: "note", senderName: n.adminName })) : [];
  return [original, ...messages, ...notes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function Message({ item, viewer, isNew }) {
  const isNote = item.kind === "note";
  const mine = !isNote && item.senderRole === viewer;
  const staff = item.senderRole === "admin";
  const name = isNote ? item.senderName : mine ? "You" : staff ? "BookLeaf Support" : item.senderName;

  return (
    <li className="msg" data-mine={mine || undefined} data-note={isNote || undefined} data-staff={staff || undefined} data-new={isNew || undefined}>
      <header className="msg__meta">
        <strong>{name}</strong>
        {isNote && <span className="msg__private"><Icon name="lock" size={12} /> Internal note, not visible to the author</span>}
        <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</time>
      </header>
      <div className="msg__body">{item.body}</div>
    </li>
  );
}