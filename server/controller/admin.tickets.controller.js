import { adminTicketsService } from "../services/admin.tickets.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Admin-side tickets (route-level `requireRole("admin")` guards all of these).
 *
 * The API speaks in friendly terms ("me", "unassigned"); the controller translates them into concrete ids
 * so services only ever deal with real values.
 *
 * Service contract:
 *   list(filters)            → ticket[]
 *        filters: { status, category, priority, assignee: undefined|"unassigned"|adminId, from, to, sort }
 *   get(id)                  → ticket   full detail: author, book snapshot, messages, internal notes, AI reasons
 *   update(id, patch, actor) → ticket   patch: any of { status, category, priority, assigneeId: string|null }
 *   reply(id, { body, resolve }, actor)  → ticket   saves the reply, notifies the author, optionally resolves
 *   addNote(id, { body }, actor)         → ticket   internal only
 *   draft(id, { regenerate })            → { body, generatedAt, cached }
 *        throws AppError.unavailable("AI_UNAVAILABLE") when the model can't be reached
 * Every write publishes a real-time event from inside the service.
 */

const resolveAssignee = (value, actorId) => (value === "me" ? actorId : value);

/** GET /api/admin/tickets?status=&category=&priority=&assignee=&from=&to=&sort= */
export const listTickets = asyncHandler(async (req, res) => {
  const filters = { ...req.query, assignee: resolveAssignee(req.query.assignee, req.user.id) };
  res.json({ tickets: await adminTicketsService.list(filters) });
});

/** GET /api/admin/tickets/:id */
export const getTicket = asyncHandler(async (req, res) => {
  res.json({ ticket: await adminTicketsService.get(req.params.id) });
});

/** PATCH /api/admin/tickets/:id  { status?, category?, priority?, assignee?: "me"|null|adminId } */
export const updateTicket = asyncHandler(async (req, res) => {
  const { assignee, ...rest } = req.body;
  const patch = { ...rest };
  // `assignee` is only part of the patch if the client sent it; null is a real value meaning "unassign"
  if (assignee !== undefined) patch.assigneeId = resolveAssignee(assignee, req.user.id);

  res.json({ ticket: await adminTicketsService.update(req.params.id, patch, req.user) });
});

/** POST /api/admin/tickets/:id/messages  { body, resolve? } → 201 */
export const replyToTicket = asyncHandler(async (req, res) => {
  const { body, resolve = false } = req.body;
  const ticket = await adminTicketsService.reply(req.params.id, { body, resolve }, req.user);
  res.status(201).json({ ticket });
});

/** POST /api/admin/tickets/:id/notes  { body } → 201 */
export const addTicketNote = asyncHandler(async (req, res) => {
  const ticket = await adminTicketsService.addNote(req.params.id, { body: req.body.body }, req.user);
  res.status(201).json({ ticket });
});

/** POST /api/admin/tickets/:id/draft  { regenerate? } */
export const draftReply = asyncHandler(async (req, res) => {
  const { regenerate = false } = req.body ?? {};
  res.json({ draft: await adminTicketsService.draft(req.params.id, { regenerate }) });
});