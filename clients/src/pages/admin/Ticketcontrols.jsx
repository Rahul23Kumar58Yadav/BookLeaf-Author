import { useId } from "react";
import { Button, Icon, Spinner } from "../common";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, SOURCE_LABEL, STATUS_OPTIONS } from "./ticketMeta";
import "./TicketControls.css";

/**
 * Status, assignment, and the two AI-set fields with override.
 * onPatch(field, patch): the page sends the PATCH and passes back `busy` (the field in flight).
 */
export function TicketControls({ ticket, meId, busy, onPatch }) {
  const mine = ticket.assignee?.id === meId;
  const pending = ticket.aiStatus === "pending";
  const usedFallback = ticket.categorySource === "rules" || ticket.prioritySource === "rules";

  return (
    <section className="tctl" aria-label="Ticket settings">
      <Select label="Status" busy={busy === "status"} value={ticket.status} options={STATUS_OPTIONS}
        onChange={(status) => onPatch("status", { status })} />

      <div className="tctl__assign">
        <span className="tctl__label">Assigned to</span>
        <div className="tctl__assign-row">
          <strong>{ticket.assignee ? (mine ? "You" : ticket.assignee.name) : "Nobody yet"}</strong>
          {mine ? (
            <Button variant="ghost" size="sm" loading={busy === "assignee"} onClick={() => onPatch("assignee", { assignee: null })}>Unassign</Button>
          ) : (
            <Button variant="secondary" size="sm" loading={busy === "assignee"} onClick={() => onPatch("assignee", { assignee: "me" })}>
              {ticket.assignee ? "Take over" : "Assign to me"}
            </Button>
          )}
        </div>
      </div>

      <Select label="Category" busy={busy === "category"} value={ticket.category ?? ""} options={CATEGORY_OPTIONS}
        placeholder={pending ? "AI is classifying…" : "Not classified"}
        source={ticket.categorySource} reason={ticket.categoryReason}
        onChange={(category) => onPatch("category", { category })} />

      <Select label="Priority" busy={busy === "priority"} value={ticket.priority ?? ""} options={PRIORITY_OPTIONS}
        placeholder={pending ? "AI is scoring…" : "Not scored"}
        source={ticket.prioritySource} reason={ticket.priorityReason}
        onChange={(priority) => onPatch("priority", { priority })} />

      {usedFallback && (
        <p className="tctl__warn" role="note">
          AI was unavailable when this arrived, so basic keyword rules set the category and priority. Please check them.
        </p>
      )}
    </section>
  );
}

function Select({ label, value, options, onChange, busy, source, reason, placeholder }) {
  const id = useId();
  return (
    <div className="tctl__field">
      <div className="tctl__top">
        <label className="tctl__label" htmlFor={id}>{label}</label>
        {busy && <Spinner size={14} label={`Saving ${label}`} />}
        {source && !busy && (
          <small className="tctl__source" data-source={source} title={SOURCE_LABEL[source]}>
            {source === "ai" && <Icon name="sparkle" size={12} />}
            {source === "ai" ? "AI" : source === "admin" ? "Edited" : "Rules"}
          </small>
        )}
      </div>
      <select id={id} value={value} disabled={busy} onChange={(e) => onChange(e.target.value)}>
        {!value && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {reason && source !== "admin" && <p className="tctl__reason">Why: {reason}</p>}
    </div>
  );
}