import { Badge, Icon } from "../common";
import { CATEGORY_META, SOURCE_LABEL } from "./ticketMeta";

/** `pending` = the async AI job hasn't finished yet. */
export function CategoryBadge({ category, source, pending }) {
  if (pending && !category) return <Badge title="AI is classifying this ticket">Classifying…</Badge>;
  const meta = CATEGORY_META[category];
  if (!meta) return <Badge>Uncategorised</Badge>;
  return (
    <Badge tone="neutral" title={SOURCE_LABEL[source]}>
      {source === "ai" && <Icon name="sparkle" size={12} />}
      {meta.label}
    </Badge>
  );
}