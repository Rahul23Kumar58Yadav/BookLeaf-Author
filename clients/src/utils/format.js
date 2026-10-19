const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN");
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const EMPTY = "—";

/** Null-safe formatters: in-production books have no MRP, date or per-copy royalty. */
export const formatINR = (v) => (v == null ? EMPTY : inr.format(v));
export const formatNumber = (v) => (v == null ? EMPTY : num.format(v));
export const formatDate = (v) => (v ? date.format(new Date(v)) : EMPTY);

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const formatDateTime = (v) => (v ? dateTime.format(new Date(v)) : EMPTY);

/** "2 hours ago", "yesterday"; falls back to a date after a week. */
export function formatRelative(v, now = Date.now()) {
  if (!v) return EMPTY;
  const diffSec = Math.round((new Date(v).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(v);
}

/** Compact age for dense tables: 45m, 5h, 3d. */
export function formatAge(v, now = Date.now()) {
  if (!v) return EMPTY;
  const min = Math.max(0, Math.round((now - new Date(v).getTime()) / 60000));
  if (min < 60) return `${min}m`;
  if (min < 48 * 60) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}