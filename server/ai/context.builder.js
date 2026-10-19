import { MIN_PAYOUT_INR } from "../../config/constants.js";

/**
 * Builds the smallest prompt input that still lets the model do its job.
 *
 *  - Classification sees the subject, the message and the book's status. Nothing else.
 *  - Drafting adds the author's FIRST name and only the book facts relevant to the ticket's category.
 *  - Never sent: email, phone, bank details, other tickets, the full conversation, or other books.
 *  - Anything computable (quarter dates, overdue or not, rollover) is computed here, so the model quotes
 *    facts instead of doing arithmetic it could get wrong.
 */

const DAY = 86_400_000;
const LIMITS = { subject: 200, classifyBody: 1500, draftBody: 2000, replyExcerpt: 500, replies: 2 };

export const truncate = (s, max) => {
  const t = String(s ?? "").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};

/** The ticket text sits inside <ticket> tags; remove any tags the author typed so they can't close it early. */
const defang = (s) => String(s ?? "").replace(/<\/?ticket>/gi, "");

// A fixed month table, not Intl: Intl's short month names vary by ICU version ("Sep" vs "Sept"), which would change
// prompts, cached-draft hashes and the draft date check depending on the Node runtime.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (ms) => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const firstName = (full) => String(full ?? "").trim().split(/\s+/)[0] || "there";
const startOfUtcDay = (ms) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };

// ---------- quarter arithmetic (quarters end 31 Mar, 30 Jun, 30 Sep, 31 Dec) ----------

function quarterEnds(year) {
  return [Date.UTC(year, 2, 31), Date.UTC(year, 5, 30), Date.UTC(year, 8, 30), Date.UTC(year, 11, 31)];
}

/** Latest quarter that has fully ended before today, and the next one to end. Exported for tests. */
export function quarterInfo(nowMs) {
  const today = startOfUtcDay(nowMs);
  const y = new Date(today).getUTCFullYear();
  const ends = [...quarterEnds(y - 1), ...quarterEnds(y), ...quarterEnds(y + 1)];
  const latest = [...ends].reverse().find((e) => e < today);
  const next = ends.find((e) => e >= today);
  const previous = ends[ends.indexOf(latest) - 1]; // the quarter before `latest`: its payout window closes first
  return { today, latest, latestDue: latest + 45 * DAY, previous, previousDue: previous + 45 * DAY, next, nextDue: next + 45 * DAY };
}

// ---------- per-category book facts ----------

function royaltyFacts(b, now) {
  const q = quarterInfo(now);
  const lines = [
    `Copies sold: ${b.copiesSold}`,
    `MRP: ${b.mrp == null ? "not set yet" : inr(b.mrp)}`,
    `Author royalty per copy: ${b.royaltyPerCopy == null ? "not set yet" : inr(b.royaltyPerCopy)}`,
    `Royalty earned to date: ${inr(b.royaltyEarned)}`,
    `Royalty paid so far: ${inr(b.royaltyPaid)}`,
    `Royalty pending: ${inr(b.royaltyPending)}`,
    `Last payout: ${b.payout?.lastPayoutDate ? fmtDate(new Date(b.payout.lastPayoutDate).getTime()) : "no payout recorded yet"}`,
    `Latest completed quarter ended ${fmtDate(q.latest)}; royalties for it are due by ${fmtDate(q.latestDue)}`,
    `Next quarter ends ${fmtDate(q.next)}; royalties for it are due by ${fmtDate(q.nextDue)}`,
  ];

  let position;
  const lastPayout = b.payout?.lastPayoutDate ? new Date(b.payout.lastPayoutDate).getTime() : null;
  const published = b.publicationDate ? new Date(b.publicationDate).getTime() : null;

  if (!b.isLive) position = "The book is not live yet, so no royalties have accrued.";
  else if (b.royaltyEarned === 0) position = "No sales recorded yet, so no royalties have accrued.";
  else if (b.royaltyPending === 0) position = "Everything earned has been paid.";
  else if (b.royaltyPending < MIN_PAYOUT_INR) position = `The pending balance is below the ${inr(MIN_PAYOUT_INR)} minimum, so it rolls over to the next quarter's payout.`;
  else {
    // Overdue is judged against the newest quarter whose 45-day payout window has already CLOSED. Judging only the
    // latest quarter would call almost everyone "not overdue yet", even an author who has never been paid.
    const closed = q.today > q.latestDue ? { end: q.latest, due: q.latestDue } : { end: q.previous, due: q.previousDue };
    const accrued = published != null && published <= closed.end; // royalties existed when that quarter ended
    const settled = lastPayout != null && lastPayout > closed.end; // a payout was recorded after it ended

    if (accrued && !settled) position = `OVERDUE: royalties for the quarter that ended ${fmtDate(closed.end)} should have been paid by ${fmtDate(closed.due)} and no payout has been recorded since. This is BookLeaf's delay: own it and escalate with a 48-hour resolution timeline.`;
    else if (published != null && published > q.latest) position = `The book was published after the latest completed quarter, so its first royalties fall in the next cycle (due by ${fmtDate(q.nextDue)}).`;
    else if (lastPayout != null && lastPayout >= q.latest) position = "A payout was recorded after the latest completed quarter ended.";
    else if (q.today <= q.latestDue) position = `The payout for the latest completed quarter is still inside its 45-day window (due by ${fmtDate(q.latestDue)}). It is not overdue yet.`;
    else position = "No payout problem is visible in the records.";
  }

  return [...lines, `Payout position: ${position}`];
}

function distributionFacts(b, now) {
  const lines = [`Status: ${b.status}`, `Publication date: ${b.publicationDate ? fmtDate(new Date(b.publicationDate).getTime()) : "not published yet"}`];
  lines.push(`Listed on: ${b.availableOn?.length ? b.availableOn.join(", ") : "no platforms yet"}`);
  if (b.publicationDate) {
    const days = Math.floor((startOfUtcDay(now) - new Date(b.publicationDate).getTime()) / DAY);
    lines.push(`Days since publication: ${days}${days < 14 ? " (may still be inside the usual 7-10 business day listing window)" : ""}`);
  }
  return lines;
}

const STAGE_NOTES = {
  "Cover Design": "Delays at this stage are usually because the cover is waiting on the author's approval.",
  Proofreading: "Delays at this stage are usually revision rounds.",
};

function statusFacts(b) {
  const lines = [`Status: ${b.status}`];
  if (b.production) {
    lines.push(`Production stage: ${b.production.current} (step ${b.production.index + 1} of ${b.production.stages.length})`);
    if (STAGE_NOTES[b.production.current]) lines.push(STAGE_NOTES[b.production.current]);
  }
  return lines;
}

/** Only what this category needs. A printing query doesn't get royalty figures, and vice versa. */
export function bookFactsFor(category, book, now = Date.now()) {
  if (!book) return ["Book: none (general / account-level query)"];
  const head = [`Book: "${book.title}"`];
  switch (category) {
    case "royalty_payments": return [...head, ...royaltyFacts(book, now)];
    case "isbn_metadata":    return [...head, `ISBN on record: ${book.isbn}`, `Status: ${book.status}`];
    case "printing_quality": return [...head, `Status: ${book.status}`, `Printed by: ${book.printPartner ?? "not assigned yet"}`,
                                     `Publication date: ${book.publicationDate ? fmtDate(new Date(book.publicationDate).getTime()) : "not published yet"}`];
    case "distribution":     return [...head, ...distributionFacts(book, now)];
    case "book_status":      return [...head, ...statusFacts(book)];
    default:                 return [...head, `Status: ${book.status}`];
  }
}

// ---------- prompt inputs ----------

/** User message for classification. No author identity, no history. */
export function buildClassifyInput({ subject, description, bookStatus }) {
  return [
    "<ticket>",
    `Subject: ${truncate(defang(subject), LIMITS.subject)}`,
    `Message: ${truncate(defang(description), LIMITS.classifyBody)}`,
    "</ticket>",
    `Book status: ${bookStatus ?? "none (general / account-level query)"}`,
  ].join("\n");
}

/**
 * User message for drafting.
 * input: { authorName, subject, description, category, book (presented), recentMessages: [{ senderRole, body }] }
 */
export function buildDraftInput({ authorName, subject, description, category, book, recentMessages = [] }, now = Date.now()) {
  const replies = recentMessages.slice(-LIMITS.replies)
    .map((m) => `- ${m.senderRole === "admin" ? "BookLeaf" : "Author"}: ${truncate(m.body, LIMITS.replyExcerpt)}`);

  return [
    "<ticket>",
    `Subject: ${truncate(defang(subject), LIMITS.subject)}`,
    `Message: ${truncate(defang(description), LIMITS.draftBody)}`,
    "</ticket>",
    ...(replies.length ? ["", "Earlier replies on this ticket (oldest first):", ...replies] : []),
    "",
    "AUTHOR AND BOOK FACTS:",
    `Author first name: ${firstName(authorName)}`,
    `Today: ${fmtDate(startOfUtcDay(now))}`,
    `Query type: ${category ?? "general"}`,
    ...bookFactsFor(category, book, now),
    "",
    "Write the reply now.",
  ].join("\n");
}