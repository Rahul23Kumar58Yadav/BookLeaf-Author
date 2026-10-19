import { PRIORITIES } from "../../config/constants.js";

/**
 * Keyword rules used when the AI can't be reached (or returns something unusable).
 * Deliberately simple and explainable: its job is to keep tickets sorted sensibly during an outage,
 * not to match the model. Results are marked source "rules" so admins know to double-check them.
 */

// [pattern, weight]. Strong, specific words weigh more than words that appear in many kinds of ticket.
const CATEGORY_RULES = {
  isbn_metadata: [[/\bisbn\b/, 4], [/\bbarcode\b/, 2], [/\bduplicate\b/, 1], [/wrong (book|title|author name|cover) (is )?(show|list|link)/, 3], [/linked to (the )?wrong/, 3]],
  royalty_payments: [[/royalt/, 3], [/\bpayout|pay out|payment|paid\b/, 2], [/\bbank (account|transfer|details)\b/, 2], [/\bearn(ed|ings?)?\b/, 1], [/₹|\brs\.?\s?\d|\brupees?\b/, 1], [/\bcommission\b/, 1], [/\bstatement|breakdown\b/, 1]],
  printing_quality: [[/\bprint(ed|ing)?\b/, 2], [/\bblurr?y\b|\bmisprint|\bmisaligned|\bbinding\b|\bsmudg/, 3], [/\bpages? (are |is )?(missing|torn|loose|falling)/, 3], [/\bcolou?r (is |are )?(off|faded|wrong|inconsisten)/, 2], [/\bdefect|\bdamaged\b|\breprint\b/, 2], [/\bauthor copies\b/, 1]],
  distribution: [[/\bunavailable\b|\bout of stock\b/, 3], [/not (showing|available|listed|visible|live)\b/, 3], [/\bre-?sync\b/, 3], [/\blisting\b|\blisted\b/, 1], [/\bamazon\b|\bflipkart\b/, 1], [/can'?t find (it|my book)/, 2], [/\bstock\b/, 1]],
  book_status: [[/\btypeset/, 3], [/\bcover design\b|\bproof(read|reading|s)?\b/, 3], [/\bstill in (editing|production|typesetting)\b/, 3], [/\bproduction\b/, 2], [/\bwhen will (it|my book)\b/, 1], [/\bdelay(ed)?\b/, 2], [/\bmanuscript\b|\bediting\b/, 1], [/\bhow long\b|\btimeline\b/, 1]],
};

// On equal scores, the more serious / more specific category wins
const TIE_ORDER = ["isbn_metadata", "royalty_payments", "printing_quality", "distribution", "book_status"];
const MIN_SCORE = 2; // one weak keyword (e.g. just "Amazon") isn't enough to leave "general"

const LEVELS = [...PRIORITIES].reverse(); // low, medium, high, critical (ascending urgency)
const rank = (p) => LEVELS.indexOf(p);
const raise = (p, by = 1) => LEVELS[Math.min(LEVELS.length - 1, rank(p) + by)];
export const atLeast = (p, floor) => (rank(p) >= rank(floor) ? p : floor);

const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const UNIT_DAYS = { day: 1, week: 7, month: 30, year: 365 };

/** Longest duration mentioned, in days ("4 months" -> 120, "three weeks" -> 21, "a year" -> 365). */
export function longestDurationDays(text) {
  let max = 0;
  for (const m of text.matchAll(/\b(\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*\+?\s*(day|week|month|year)s?\b/g)) {
    const n = /^\d/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1]];
    max = Math.max(max, n * UNIT_DAYS[m[2]]);
  }
  return max;
}

const LEGAL = /\b(lawyer|legal action|sue\b|suing|court|police|fraud|scam|cheat(ed|ing)?|consumer forum|defam|report you)\b/;
const NEVER_PAID = /\b(never|not|haven'?t|hasn'?t|didn'?t|did not|no)\b[^.?!]{0,40}\b(receiv|paid|payment|royalt|payout)/;
const HEATED = /\b(urgent(ly)?|asap|immediately|unacceptable|worst|furious|disgust|third time|again and again|still no (reply|response|answer)|no one (is )?(reply|respond))\b|!{2,}/;
const SEVERE_PRINT = /\b(all (the |my )?copies|entire (batch|order)|wrong book|every copy)\b/;

/**
 * Policy minimums that hold no matter who classified the ticket, AI or rules.
 * KB: "If an author reports an ISBN error ... it is treated as a high-priority issue."
 */
export function enforcePolicyFloors({ category, priority, priorityReason }) {
  if (category === "isbn_metadata" && rank(priority) < rank("high")) {
    return { priority: "high", priorityReason: `${priorityReason ? `${priorityReason} ` : ""}(Raised to High: ISBN errors are high priority by policy.)`.trim() };
  }
  return { priority, priorityReason };
}

export function classifyByRules({ subject = "", description = "" }) {
  // Phone keyboards turn ' into ’ automatically; patterns below are written with the plain apostrophe
  const text = `${subject}\n${description}`.toLowerCase().replace(/[\u2018\u2019\u02bc]/g, "'");

  // ---- category ----
  const scores = Object.fromEntries(Object.entries(CATEGORY_RULES).map(([cat, rules]) => [cat, rules.reduce((s, [re, w]) => s + (re.test(text) ? w : 0), 0)]));
  const best = TIE_ORDER.reduce((a, c) => (scores[c] > scores[a] ? c : a), TIE_ORDER[0]);
  const category = scores[best] >= MIN_SCORE ? best : "general";

  // ---- priority ----
  const signals = [];
  const days = longestDurationDays(text);
  let priority = { royalty_payments: "medium", isbn_metadata: "high", printing_quality: "medium", distribution: "high", book_status: "low", general: "low" }[category];

  if (category === "royalty_payments") {
    const missing = NEVER_PAID.test(text);
    if (missing && days >= 180) { priority = "critical"; signals.push(`no royalty for about ${Math.round(days / 30)} months`); }
    else if (missing && days >= 90) { priority = "high"; signals.push(`no royalty for about ${Math.round(days / 30)} months`); }
    else if (missing) { priority = "high"; signals.push("says royalty not received"); }
  }
  if (category === "book_status") {
    if (days >= 60) { priority = "high"; signals.push(`stuck for about ${Math.round(days / 7)} weeks`); }
    else if (days >= 21) { priority = "medium"; signals.push(`delay of about ${Math.round(days / 7)} weeks`); }
  }
  if (category === "printing_quality" && SEVERE_PRINT.test(text)) { priority = "high"; signals.push("defects across all copies"); }

  if (LEGAL.test(text)) { priority = "critical"; signals.push("legal or fraud language"); }
  else if (category !== "general" && HEATED.test(text)) { priority = raise(priority); signals.push("urgent or frustrated tone"); }

  const floored = enforcePolicyFloors({ category, priority, priorityReason: "" });

  const matched = category === "general" ? "no strong category keywords" : `${category.replace("_", " ")} keywords`;
  return {
    category,
    priority: floored.priority,
    categoryReason: `Keyword rules (AI unavailable): ${matched}.`,
    priorityReason: `Keyword rules (AI unavailable): ${signals.length ? signals.join("; ") : "default for this category"}.${floored.priorityReason ? ` ${floored.priorityReason}` : ""}`,
    source: "rules",
  };
}