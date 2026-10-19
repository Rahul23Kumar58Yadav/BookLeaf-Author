import { createHash } from "node:crypto";
import { GUIDANCE, SECTIONS, SECTIONS_BY_CATEGORY } from "./sections.js";

/** Changes whenever any knowledge text changes, so cached drafts built on old policy are never reused. */
export const KB_VERSION = createHash("sha256")
  .update(JSON.stringify([SECTIONS, SECTIONS_BY_CATEGORY, GUIDANCE]))
  .digest("hex")
  .slice(0, 12);

/** Only the policy text relevant to this category: the main lever on prompt size. */
export function getKbContext(category) {
  const keys = SECTIONS_BY_CATEGORY[category] ?? SECTIONS_BY_CATEGORY.general;
  return keys.map((k) => SECTIONS[k]).join("\n\n");
}

export const getGuidance = (category) => GUIDANCE[category] ?? GUIDANCE.general;