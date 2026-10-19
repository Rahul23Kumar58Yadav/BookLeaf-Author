import { ticketsService } from "../services/tickets.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Author-side tickets. Every call is scoped by the *token's* user (req.user), never by anything in the body.
 *
 * Service contract:
 *   listForAuthor(user)            → ticket[]   newest-updated first; list shape, no internal notes
 *   getForAuthor(user, id)         → ticket     throws AppError.notFound for someone else's ticket (404, not 403)
 *   create(user, { bookId, subject, description }) → ticket
 *        validates that bookId (if any) belongs to this author, saves the ticket, then queues AI
 *        classification in the background. It must NOT wait for the AI, so tickets are created even if it's down.
 */

/** GET /api/tickets */
export const listTickets = asyncHandler(async (req, res) => {
  res.json({ tickets: await ticketsService.listForAuthor(req.user) });
});

/** GET /api/tickets/:id */
export const getTicket = asyncHandler(async (req, res) => {
  res.json({ ticket: await ticketsService.getForAuthor(req.user, req.params.id) });
});

/** POST /api/tickets  { bookId: string|null, subject, description } → 201 */
export const createTicket = asyncHandler(async (req, res) => {
  const { bookId, subject, description } = req.body; // explicit pick: nothing else the client sends reaches the service
  const ticket = await ticketsService.create(req.user, { bookId: bookId ?? null, subject, description });
  res.status(201).location(`${req.baseUrl}/${ticket.id}`).json({ ticket });
});