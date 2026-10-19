import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { adminTicketsApi } from "../../api/admin.tickets.api";
import { useAuth } from "../../hooks/useAuth";
import { useAdminTicket } from "../../hooks/useAdminTickets";
import {
  PriorityBadge, ReplyComposer, StatusBadge, TicketContext, TicketControls, TicketThread,
} from "../../components/tickets";
import { Button, EmptyState, LiveStatus, PageSpinner } from "../../components/common";
import { formatDateTime } from "../../utils/format";
import "./TicketWorkspacePage.css";

const ACTIVE = ["open", "in_progress"];

export default function TicketWorkspacePage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const { data, loading, error, reload, setData, live } = useAdminTicket(id);

  const [busy, setBusy] = useState(null);       // which control is saving
  const [banner, setBanner] = useState("");     // error from a settings change
  const [draft, setDraft] = useState({ state: "idle" });

  const ticket = data?.ticket;
  const draftable = ticket ? ACTIVE.includes(ticket.status) : null; // null until the ticket has loaded

  const loadDraft = useCallback(async ({ regenerate = false, signal } = {}) => {
    setDraft({ state: "loading" });
    try {
      const { draft: d } = await adminTicketsApi.draft(id, { regenerate }, { signal });
      setDraft({ state: "ready", body: d.body });
    } catch (e) {
      if (e.name === "AbortError") return;
      // The ticket still works without AI: the composer shows the reason and the editor stays usable
      setDraft({ state: "error", code: e.code, message: e.message });
    }
  }, [id]);

  // Draft once per opened ticket, and only for tickets still being worked. The server caches it.
  useEffect(() => {
    if (draftable !== true) { setDraft({ state: "idle" }); return; }
    const ctrl = new AbortController();
    loadDraft({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [id, draftable, loadDraft]);

  useEffect(() => {
    if (ticket) document.title = `${ticket.subject} · Ops`;
    return () => { document.title = "BookLeaf Author Support"; };
  }, [ticket?.subject]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(field, body) {
    setBusy(field);
    setBanner("");
    try {
      const { ticket: next } = await adminTicketsApi.update(id, body);
      setData({ ticket: next });
    } catch (e) {
      setBanner(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function sendReply(payload) {
    const { ticket: next } = await adminTicketsApi.reply(id, payload); // throws → shown inside the composer
    setData({ ticket: next });
    setDraft({ state: "idle" });
  }

  async function addNote(body) {
    const { ticket: next } = await adminTicketsApi.addNote(id, { body });
    setData({ ticket: next });
  }

  if (loading && !ticket) return <PageSpinner label="Loading ticket" />;

  if (error && !ticket) {
    const notFound = error.status === 404;
    return (
      <EmptyState icon="close" title={notFound ? "Ticket not found" : "We couldn't load this ticket"}
        description={notFound ? "It may have been deleted, or the link is wrong." : error.message}
        action={notFound ? <Button as={Link} to="/admin/tickets">Back to the queue</Button> : <Button onClick={reload}>Try again</Button>} />
    );
  }

  return (
    <div className="ws">
      <Link to={`/admin/tickets${state?.search ?? ""}`} className="ws__back">‹ Back to queue</Link>

      <header className="ws__head">
        <div>
          <h2>{ticket.subject}</h2>
          <p className="ws__meta">
            {ticket.author.name} · {ticket.book?.title ?? "General / Account level"} · Opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <div className="ws__badges">
          <PriorityBadge priority={ticket.priority} source={ticket.prioritySource} />
          <StatusBadge status={ticket.status} />
        </div>
      </header>

      <div className="ws__grid">
        <div className="ws__main">
          <LiveStatus live={live} liveText="Live: changes by other admins appear automatically" offlineText="Reconnecting…" />
          <TicketThread ticket={ticket} viewer="admin">
            {/* key resets the editor's local text when you move to another ticket */}
            <ReplyComposer
              key={id}
              draft={draft}
              closed={draftable === false}
              onGenerate={() => loadDraft()}
              onRegenerate={() => loadDraft({ regenerate: true })}
              onSendReply={sendReply}
              onAddNote={addNote}
            />
          </TicketThread>
        </div>

        <aside className="ws__side">
          {banner && <p className="ws__banner" role="alert">{banner}</p>}
          <TicketControls ticket={ticket} meId={user.id} busy={busy} onPatch={patch} />
          <TicketContext author={ticket.author} book={ticket.book} />
        </aside>
      </div>
    </div>
  );
}