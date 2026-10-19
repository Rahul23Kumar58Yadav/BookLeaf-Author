import { bookRepo } from "../repositories/book.repo.js";
import { AppError } from "../utils/AppError.js";
import { LIVE_STATUS, MIN_PAYOUT_INR, PRODUCTION_STAGES, ROLES } from "../config/constants.js";

/** Pending is derived, never trusted from stored data. */
const pendingOf = (b) => Math.max(0, b.royaltyEarned - b.royaltyPaid);

/**
 * Where a book is in the pipeline, parsed from "In Production - Cover Design".
 * Returns null for live books so the UI can skip the tracker entirely.
 */
function stageOf(status) {
  if (status === LIVE_STATUS) return null;
  const name = status.split(" - ")[1]?.trim();
  const index = PRODUCTION_STAGES.indexOf(name);
  return { current: name ?? status, index: index === -1 ? 0 : index, stages: PRODUCTION_STAGES };
}

/**
 * Describes the payout situation so the UI never re-derives business rules.
 *  not_applicable: nothing earned yet (in production, or no sales)
 *  none:    earned > 0, never paid
 *  partial: some paid, some pending
 *  settled: fully paid
 * `rollover` = pending exists but is under the ₹1,000 threshold (KB policy).
 */
function payoutOf(b, pending) {
  let state = "not_applicable";
  if (b.royaltyEarned > 0) state = b.royaltyPaid === 0 ? "none" : pending > 0 ? "partial" : "settled";
  return {
    state,
    rollover: pending > 0 && pending < MIN_PAYOUT_INR,
    lastPayoutDate: b.lastPayoutDate,
    minThreshold: MIN_PAYOUT_INR,
  };
}

/** Shape a DB row into the API contract. Nullable fields stay null; the client decides how to show them. */
export function presentBook(b) {
  const pending = pendingOf(b);
  return {
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    genre: b.genre,
    publicationDate: b.publicationDate,
    status: b.status,
    isLive: b.status === LIVE_STATUS,
    mrp: b.mrp,
    royaltyPerCopy: b.royaltyPerCopy,
    copiesSold: b.copiesSold,
    royaltyEarned: b.royaltyEarned,
    royaltyPaid: b.royaltyPaid,
    royaltyPending: pending,
    payout: payoutOf(b, pending),
    printPartner: b.printPartner,
    availableOn: b.availableOn,
    production: stageOf(b.status),
    author: b.author,
  };
}

function summarize(books) {
  return books.reduce(
    (s, b) => ({
      titles: s.titles + 1,
      liveTitles: s.liveTitles + (b.isLive ? 1 : 0),
      inProduction: s.inProduction + (b.isLive ? 0 : 1),
      copiesSold: s.copiesSold + b.copiesSold,
      royaltyEarned: s.royaltyEarned + b.royaltyEarned,
      royaltyPaid: s.royaltyPaid + b.royaltyPaid,
      royaltyPending: s.royaltyPending + b.royaltyPending,
    }),
    { titles: 0, liveTitles: 0, inProduction: 0, copiesSold: 0, royaltyEarned: 0, royaltyPaid: 0, royaltyPending: 0 }
  );
}

export const booksService = {
  /** Authors are always scoped to their own id (from the JWT); only admins may pass authorId. */
  async list(user, { authorId } = {}) {
    const scope = user.role === ROLES.ADMIN ? authorId : user.authorId;
    const books = (await bookRepo.findMany({ authorId: scope })).map(presentBook);
    return { books, summary: summarize(books) };
  },

  async get(user, id) {
    const book = await bookRepo.findById(id);
    // 404 (not 403) for someone else's book: don't confirm that the id exists
    if (!book || (user.role !== ROLES.ADMIN && book.authorId !== user.authorId)) {
      throw AppError.notFound("Book not found");
    }
    return presentBook(book);
  },
};