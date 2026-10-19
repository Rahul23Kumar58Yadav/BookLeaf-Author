import { Badge, Icon } from "../common";
import { PRIORITY_META } from "./ticketMeta";

/**
 * `source` tells the admin who set it: "ai" shows a sparkle, "admin" means it was overridden.
 * Authors never see priority, so this is admin-side only.
 */
export function PriorityBadge({ priority, source }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <Badge>Not scored</Badge>;

  const title =
    source === "ai" ? "Scored automatically by AI" :
    source === "admin" ? "Changed by an admin" :
    source === "rules" ? "Scored by fallback rules (AI was unavailable)" : undefined;

  return (
    <Badge tone={meta.tone} title={title}>
      {source === "ai" && <Icon name="sparkle" size={12} />}
      {meta.label}
    </Badge>
  );
}