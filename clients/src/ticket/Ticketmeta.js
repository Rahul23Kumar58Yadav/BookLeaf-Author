/** Shared display metadata for ticket enums. Values match the API's snake_case enums. */
export const STATUS_META = {
  open:        { label: "Open",        tone: "info" },
  in_progress: { label: "In progress", tone: "warning" },
  resolved:    { label: "Resolved",    tone: "success" },
  closed:      { label: "Closed",      tone: "neutral" },
};

export const PRIORITY_META = {
  critical: { label: "Critical", tone: "critical" },
  high:     { label: "High",     tone: "danger" },
  medium:   { label: "Medium",   tone: "warning" },
  low:      { label: "Low",      tone: "neutral" },
};

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));
export const PRIORITY_OPTIONS = Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }));

export const CATEGORY_META = {
  royalty_payments: { label: "Royalty & Payments" },
  isbn_metadata:    { label: "ISBN & Metadata Issues" },
  printing_quality: { label: "Printing & Quality" },
  distribution:     { label: "Distribution & Availability" },
  book_status:      { label: "Book Status & Production Updates" },
  general:          { label: "General Inquiry" },
};
export const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, m]) => ({ value, label: m.label }));

/** Unresolved = still needs the team's attention. */
export const isUnresolved = (status) => status === "open" || status === "in_progress";

/** KB: escalations get a 48-hour resolution timeline, so that's our "overdue" line. */
export const SLA_HOURS = 48;

/** Age of a ticket for the queue: label ("2d 4h"), colour tone, and whether it's past the SLA. */
export function ageOf(createdAt, status, now = Date.now()) {
  const ms = Math.max(0, now - new Date(createdAt).getTime());
  const h = ms / 36e5;
  const d = Math.floor(h / 24);
  const label = h < 1 ? `${Math.max(1, Math.round(ms / 6e4))}m` : h < 24 ? `${Math.floor(h)}h` : `${d}d ${Math.floor(h - d * 24)}h`;
  const open = isUnresolved(status);
  return {
    label,
    overdue: open && h >= SLA_HOURS,
    tone: !open ? "neutral" : h >= SLA_HOURS ? "danger" : h >= SLA_HOURS / 2 ? "warning" : "neutral",
  };
}

/** Who set a classification: drives the little marker next to category/priority. */
export const SOURCE_LABEL = {
  ai: "Suggested by AI",
  admin: "Set by an admin",
  rules: "Set by fallback rules (AI was unavailable). Worth a quick check.",
};

/** Thin aliases so callers that think in "overdue" terms don't re-derive it from ageOf/SLA_HOURS. */
export const OVERDUE_HOURS = SLA_HOURS;
export const isOverdue = (ticket, now = Date.now()) => ageOf(ticket.createdAt, ticket.status, now).overdue;