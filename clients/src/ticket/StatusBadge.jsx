import { Badge } from "../common";
import { STATUS_META } from "./ticketMeta";

export function StatusBadge({ status }) {
  // Unknown values render as neutral text instead of crashing the list
  const meta = STATUS_META[status] ?? { label: String(status ?? "Unknown"), tone: "neutral" };
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}