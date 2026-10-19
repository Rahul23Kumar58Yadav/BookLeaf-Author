import { CATEGORIES, PRIORITIES } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";
import { AiError, complete, recordCacheHit } from "./ai.client.js";
import { classificationCache, normalize, sha256 } from "./cache.js";
import { buildClassifyInput, truncate } from "./context.builder.js";
import { classifyByRules, enforcePolicyFloors } from "./fallback.js";
import { CLASSIFY_PROMPT_VERSION, CLASSIFY_SYSTEM, CLASSIFY_TOOL } from "./prompts/classify.prompt.js";

const reason = (s, fallback) => (typeof s === "string" && s.trim() ? truncate(s, 200) : fallback);

/** Never trust model output: enums are checked against our own lists even though the tool schema constrains them. */
function validate(input) {
  if (!input || !CATEGORIES.includes(input.category) || !PRIORITIES.includes(input.priority)) return null;
  return {
    category: input.category,
    priority: input.priority,
    categoryReason: reason(input.category_reason, "Classified by AI."),
    priorityReason: reason(input.priority_reason, "Prioritised by AI."),
  };
}

/**
 * Category + priority in ONE call (half the cost of two). Never throws: if the AI is down, rate-limited, slow, or
 * returns something unusable, keyword rules classify instead, so every ticket always ends up sorted.
 *
 * @returns {{ category, priority, categoryReason, priorityReason, source: "ai"|"rules", aiStatus: "done"|"failed", cached: boolean, aiError?: string }}
 */
export async function classifyTicket({ id = null, subject, description, bookStatus = null }) {
  // Identical text + book status gets an identical answer without paying for another call
  const key = sha256(CLASSIFY_PROMPT_VERSION, normalize(subject), normalize(description), bookStatus ?? "");
  const hit = classificationCache.get(key);
  if (hit) {
    await recordCacheHit({ task: "classify", ticketId: id });
    return { ...hit, cached: true };
  }

  try {
    const r = await complete({
      task: "classify", ticketId: id,
      system: CLASSIFY_SYSTEM,
      user: buildClassifyInput({ subject, description, bookStatus }),
      maxTokens: 250, temperature: 0, tool: CLASSIFY_TOOL,
    });

    const parsed = validate(r.toolInput);
    if (!parsed) throw new AiError("AI_BAD_RESPONSE", "Model returned a category or priority outside the allowed values");

    // Business rules sit on top of the model: policy minimums hold even if the model disagrees
    const floored = enforcePolicyFloors(parsed);
    const result = { ...parsed, ...floored, source: "ai", aiStatus: "done" };
    classificationCache.set(key, result);
    return { ...result, cached: false };
  } catch (err) {
    const code = err instanceof AiError ? err.code : "UNEXPECTED";
    if (code === "UNEXPECTED") logger.error("[ai] classifier crashed, using rules:", err);
    else logger.error(`[ai] classification fell back to rules (${code})`);
    return { ...classifyByRules({ subject, description }), aiStatus: "failed", cached: false, aiError: code };
  }
}