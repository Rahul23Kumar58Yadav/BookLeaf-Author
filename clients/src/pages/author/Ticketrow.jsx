import { Link } from "react-router-dom";
import { formatRelative } from "../../utils/format";
import { StatusBadge } from "./StatusBadge";
import "./TicketRow.css";

/** One row in the author's ticket list. The whole row is the link. */
export function TicketRow({ ticket }) {
  const { id, subject, status, book, createdAt, updatedAt, lastMessage } = ticket;
  const teamReplied = lastMessage?.senderRole === "admin";

  return (
    <li>
      <Link to={`/tickets/${id}`} className="trow" data-replied={teamReplied || undefined}>
        <div className="trow__top">
          <h3>{subject}</h3>
          <StatusBadge status={status} />
        </div>

        <p className="trow__meta">
          <span>{book?.title ?? "General / Account level"}</span>
          <span>Opened {formatRelative(createdAt)}</span>
        </p>

        {teamReplied ? (
          <p className="trow__reply">BookLeaf replied {formatRelative(lastMessage.createdAt)}</p>
        ) : status === "open" ? (
          <p className="trow__wait">Waiting for a reply · updated {formatRelative(updatedAt)}</p>
        ) : null}
      </Link>
    </li>
  );
}