import { env } from "../../config/env.js";
import { draftRepo } from "../../repositories/draft.repo.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import { complete, recordCacheHit } from "./ai.client.js";
import { sha256 } from "./cache.js";
import { buildDraftInput } from "./context.builder.js";
import { KB_VERSION, getKbContext } from "./knowledge-base/index.js";
import { DRAFT_PROMPT_VERSION, buildDraftSystem } from "./prompts/draft.prompt.js";

const unavailable = (msg = "AI drafting isn't available right now.") => AppError.unavailable("AI_UNAVAILABLE", msg);

// ---------- cleaning and checking the model's text ----------

/** Models sometimes add fences, a "Subject:" line, or markdown despite instructions. Strip it rather than fail. */
export function cleanDraft(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\n?|\n?```$/gi, "")
    .replace(/^\s*subject:.*\n+/i, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .trim();
}

/** Unusable output: too short, absurdly long, or containing an unfilled [placeholder]. */
export const isUsable = (body) => body.length >= 40 && body.length <= 4000 && !/\[[^\]\n]{2,40}\]/.test(body);

// Must start and end on a digit: in prose an amount is often followed by "," or "." that is punctuation, not part of it
const MONEY = /₹\s?\d(?:[\d,]*\d)?(?:\.\d+)?/g;
const DATE = /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4}\b/g;
// "Sept" and "Sep" are the same month: a draft that writes either must match the facts
const squash = (s) => s.replace(/Sept\b/g, "Sep").replace(/\s/g, "");

/**
 * A cheap safety net against invented facts: every rupee amount and date in the draft must appear in what we
 * gave the model (the facts, plus the policy text). Anything else is flagged for the admin, never silently sent.
 */
export function checkDraft(body, grounding) {
  const known = squash(grounding);
  const warnings = [];
  for (const m of new Set(body.match(MONEY) ?? [])) if (!known.includes(squash(m))) warnings.push(`The draft mentions ${m}, which isn't in this author's records. Check it before sending.`);
  for (const d of new Set(body.match(DATE) ?? [])) if (!known.includes(squash(d))) warnings.push(`The draft mentions the date ${d}, which isn't in this author's records. Check it before sending.`);
  return warnings;
}

// ---------- drafting ----------

const inflight = new Map(); // ticketId:mode -> Promise. Two admins (or a double render) share one model call.

/**
 * input: { ticketId, authorName, subject, description, category, book (as presented by books.service),
 *          recentMessages: [{ senderRole, body }] }
 * Cost controls: only this category's policy text; only the relevant book facts; last 2 replies at most; the draft is
 * stored per ticket and reused until its inputs (ticket, book facts, policy text, prompt, model, date) change.
 *
 * Throws AppError 503 "AI_UNAVAILABLE" when the model can't help. The ticket still works: the admin writes the reply.
 * @returns {Promise<{ body, generatedAt, cached, model, warnings: string[] }>}
 */
export function draftReply(input, { regenerate = false } = {}) {
  const key = `${input.ticketId}:${regenerate ? "regen" : "normal"}`;
  if (inflight.has(key)) return inflight.get(key);
  const p = generate(input, regenerate).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function generate(input, regenerate) {
  const category = input.category ?? "general"; // the classifier may not have finished: still draft, from general policy
  const now = input.now ?? Date.now();
  const system = buildDraftSystem(category);
  const user = buildDraftInput({ ...input, category }, now);
  const grounding = `${user}\n${getKbContext(category)}`;
  const inputHash = sha256(DRAFT_PROMPT_VERSION, KB_VERSION, env.AI_MODEL, system, user);

  const stored = await draftRepo.find(input.ticketId);
  if (!regenerate && stored?.inputHash === inputHash) {
    await recordCacheHit({ task: "draft", ticketId: input.ticketId });
    return { body: stored.body, generatedAt: stored.generatedAt, cached: true, model: stored.model, warnings: checkDraft(stored.body, grounding) };
  }

  let r;
  try {
    r = await complete({ task: "draft", ticketId: input.ticketId, system, user, maxTokens: 600, temperature: 0.3, cacheSystem: true });
  } catch (err) {
    if (err.name === "AiError") throw unavailable();
    throw err;
  }

  const body = cleanDraft(r.text);
  if (r.stopReason === "max_tokens" || !isUsable(body)) throw unavailable("The AI draft came back incomplete. Please try again or write the reply yourself.");

  // The model call is already paid for: a database hiccup while storing the draft must not throw it away.
  // Worst case the draft isn't cached and the next open regenerates it.
  let saved = null;
  try { saved = await draftRepo.upsert(input.ticketId, { body, model: r.model, inputHash }); }
  catch (err) { logger.error("[ai] could not store draft (returning it anyway):", err.message); }
  return { body, generatedAt: saved?.generatedAt ?? new Date(), cached: false, model: r.model, warnings: checkDraft(body, grounding) };
}