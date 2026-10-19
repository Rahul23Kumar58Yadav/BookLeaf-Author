import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTicket } from "../../hooks/useTickets";
import { StatusBadge, TicketThread } from "../../components/tickets";
import { Button, EmptyState, LiveStatus, PageSpinner } from "../../components/common";
import { formatDateTime } from "../../utils/format";
import "./TicketDetailPage.css";

/** One plain sentence per status, so authors know what to expect without guessing. */
const STATUS_HINT = {
  open: "We've received your query and it's waiting to be picked up.",
  in_progress: "The team is working on this now.",
  resolved: "The team marked this as resolved. If something's still wrong, raise a new query and mention this one.",
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { data, loading, error, reload, live } = useTicket(id);
  const ticket = data?.ticket;

  useEffect(() => {
    if (ticket) document.title = `${ticket.subject} · BookLeaf Support`;
    return () => { document.title = "BookLeaf Author Support"; };
  }, [ticket?.subject]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageSpinner label="Loading your ticket" />;

  if (error) {
    const notFound = error.status === 404;
    return (
      <EmptyState
        icon="close"
        title={notFound ? "We couldn't find that ticket" : "We couldn't load this ticket"}
        description={notFound ? "It may have been removed, or the link is incorrect." : error.message}
        action={
          notFound
            ? <Button as={Link} to="/tickets">Back to my tickets</Button>
            : <Button onClick={reload}>Try again</Button>
        }
      />
    );
  }

  return (
    <article className="tdetail">
      <Link to="/tickets" className="tdetail__back">‹ All tickets</Link>

      {state?.justCreated && (
        <p className="tdetail__flash" role="status">
          Query submitted. Replies will show up here on their own, so there's no need to refresh.
        </p>
      )}

      <header className="tdetail__head">
        <div>
          <h2>{ticket.subject}</h2>
          <p className="tdetail__meta">
            {ticket.book?.title ?? "General / Account level"} · Opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
      </header>

      {STATUS_HINT[ticket.status] && <p className="tdetail__hint">{STATUS_HINT[ticket.status]}</p>}

      <LiveStatus live={live} liveText="Live: new replies appear automatically" offlineText="Reconnecting… you may need to refresh to see new replies" />

      <TicketThread ticket={ticket} viewer="author" />
    </article>
  );
}