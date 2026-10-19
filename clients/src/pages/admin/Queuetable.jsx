import { Link } from "react-router-dom";
import { formatAge, waitState } from "../../utils/sla";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import "./QueueTable.css";

/**
 * Admin queue. Urgency is visible without reading anything:
 * a coloured left edge by priority, and a red tint + "overdue" wait chip when a ticket has been
 * waiting on BookLeaf longer than its priority's target.
 * `search` is the queue's current query string; it's passed to the workspace so "Back" restores filters.
 */
export function QueueTable({ tickets, meId, now, search }) {
  return (
    <table className="queue">
      <caption className="visually-hidden">Support tickets, most urgent first</caption>
      <thead>
        <tr>
          <th scope="col">Priority</th>
          <th scope="col">Ticket</th>
          <th scope="col">Category</th>
          <th scope="col">Status</th>
          <th scope="col">Assigned</th>
          <th scope="col">Waiting</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <Row key={t.id} t={t} meId={meId} now={now} search={search} />
        ))}
      </tbody>
    </table>
  );
}

function Row({ t, meId, now, search }) {
  const w = waitState(t, now);
  const pending = t.aiStatus === "pending";

  return (
    <tr className="qrow" data-priority={t.priority ?? "none"} data-overdue={w.overdue || undefined}>
      <td data-label="Priority">
        {pending && !t.priority ? <span className="qrow__dim">Scoring…</span> : <PriorityBadge priority={t.priority} source={t.prioritySource} />}
      </td>

      <td data-label="Ticket" className="qrow__main">
        {/* The link's ::after stretches over the whole row, so the full row is clickable */}
        <Link className="qrow__link" to={`/admin/tickets/${t.id}`} state={{ search }}>{t.subject}</Link>
        <span className="qrow__sub">{t.author.name} · {t.book?.title ?? "General / Account level"}</span>
      </td>

      <td data-label="Category"><CategoryBadge category={t.category} source={t.categorySource} pending={pending} /></td>
      <td data-label="Status"><StatusBadge status={t.status} /></td>

      <td data-label="Assigned">
        {t.assignee
          ? <span>{t.assignee.id === meId ? "You" : t.assignee.name}</span>
          : <span className="qrow__dim">Unassigned</span>}
      </td>

      <td data-label="Waiting"><Wait w={w} /></td>
    </tr>
  );
}

function Wait({ w }) {
  if (w.kind === "none") return <span className="qrow__dim">—</span>;
  if (w.kind === "replied") return <span className="wait" data-kind="replied" title="Staff replied; waiting on the author">Replied {formatAge(w.hours)} ago</span>;
  return (
    <span className="wait" data-kind="waiting" data-overdue={w.overdue || undefined}
      title={`Target response time for this priority: ${w.limit}h`}>
      {w.overdue ? "Overdue · " : ""}{formatAge(w.hours)}
    </span>
  );
}