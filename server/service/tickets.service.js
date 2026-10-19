import { bookRepo } from "../repositories/book.repo.js";
import { ticketRepo } from "../repositories/ticket.repo.js";
import { TICKET_CREATED, bus } from "../utils/bus.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { EVENTS, realtimeService } from "./realtime.service.js";

const STAFF_NAME = "BookLeaf Support"; // authors see the team, never an individual admin's name
const DUPLICATE_WINDOW_MS = 2 * 60_000;

// ---- presenters: build the author-facing shape field by field (an allow-list, not "everything minus secrets") ----

const presentListItem = (t) => ({
  id: t.id,
  number: t.number,
  subject: t.subject,
  status: t.status,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  book: t.book ?? null,
  lastMessage: t.messages?.[0] ? { senderRole: t.messages[0].senderRole, createdAt: t.messages[0].createdAt } : null,
});

const presentDetail = (t) => ({
  id: t.id,
  number: t.number,
  subject: t.subject,
  description: t.description,
  status: t.status,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  book: t.book ?? null,
  author: { name: t.author.name },
  messages: t.messages.map((m) => ({
    id: m.id,
    senderRole: m.senderRole,
    senderName: m.senderRole === "admin" ? STAFF_NAME : t.author.name,
    body: m.body,
    createdAt: m.createdAt,
  })),
});

/** Author endpoints are only meaningful for a user linked to an author record. */
function requireAuthor(user) {
  if (!user.authorId) throw AppError.forbidden("Only authors can use this.");
  return user.authorId;
}

export const ticketsService = {
  async listForAuthor(user) {
    const authorId = requireAuthor(user);
    return (await ticketRepo.findManyByAuthor(authorId)).map(presentListItem);
  },

  async getForAuthor(user, id) {
    const authorId = requireAuthor(user);
    const ticket = await ticketRepo.findDetailById(id);
    // 404 for "doesn't exist" and "belongs to someone else" alike: ids of other authors' tickets stay unknowable
    if (!ticket || ticket.authorId !== authorId) throw AppError.notFound("Ticket not found");
    return presentDetail(ticket);
  },

  /**
   * Saves the ticket and returns immediately. AI classification happens afterwards in the background, so a
   * ticket always gets created, even if the model is down or slow.
   */
  async create(user, { bookId, subject, description }) {
    const authorId = requireAuthor(user); // from the token, never from the request body

    if (bookId) {
      const book = await bookRepo.findById(bookId);
      // Same answer for "no such book" and "someone else's book": don't reveal other authors' book ids
      if (!book || book.authorId !== authorId) {
        throw AppError.badRequest("Validation failed", [
          { field: "bookId", message: "Choose one of your own books, or General / Account level." },
        ]);
      }
    }

    // A retry after a timeout (or a double-click) sends the same text again: return the original, don't duplicate
    const existing = await ticketRepo.findRecentDuplicate({
      authorId, bookId: bookId ?? null, subject, description, since: new Date(Date.now() - DUPLICATE_WINDOW_MS),
    });
    if (existing) return presentDetail(existing);

    const ticket = await ticketRepo.create({ authorId, bookId: bookId ?? null, subject, description });

    // Everything after the save is best-effort: the ticket exists, so nothing below may turn this into an error
    try { bus.emit(TICKET_CREATED, { ticketId: ticket.id }); }
    catch (err) { logger.error("[tickets] ticket.created listener failed:", err); }
    realtimeService.publish(EVENTS.CREATED, { id: ticket.id, authorId }, "staff");

    return presentDetail(ticket);
  },
};