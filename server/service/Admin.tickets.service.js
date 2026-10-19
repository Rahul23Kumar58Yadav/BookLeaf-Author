import { adminTicketRepo } from "../repositories/admin.ticket.repo.js";
import { userRepo } from "../repositories/user.repo.js";
import { AppError } from "../utils/AppError.js";
import { draftReply } from "./ai/index.js";
import { presentBook } from "./books.service.js";
import { EVENTS, realtimeService } from "./realtime.service.js";

const LIST_CAP = 300; // a queue longer than this should be filtered, not scrolled

const presentListItem = (t) => ({
  id: t.id, number: t.number, subject: t.subject, status: t.status,
  category: t.category, categorySource: t.categorySource, priority: t.priority, prioritySource: t.prioritySource,
  aiStatus: t.aiStatus, createdAt: t.createdAt, updatedAt: t.updatedAt,
  author: t.author, book: t.book ?? null, assignee: t.assignee ?? null,
  lastMessage: t.messages?.[0] ? { senderRole: t.messages[0].senderRole, createdAt: t.messages[0].createdAt } : null,
});

const presentDetail = (t) => ({
  ...presentListItem(t),
  description: t.description,
  categoryReason: t.categoryReason, priorityReason: t.priorityReason, resolvedAt: t.resolvedAt,
  book: t.book ? presentBook(t.book) : null,
  messages: t.messages.map((m) => ({ id: m.id, senderRole: m.senderRole, senderName: m.sender?.name ?? "BookLeaf Support", body: m.body, createdAt: m.createdAt })),
  notes: t.notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt, adminName: n.admin?.name ?? "Admin" })),
});

const ticketRef = (t) => ({ id: t.id, authorId: t.authorId });

async function load(id) {
  const ticket = await adminTicketRepo.findDetail(id);
  if (!ticket) throw AppError.notFound("Ticket not found");
  return ticket;
}

export const adminTicketsService = {
  /** filters: { status, category, priority, assignee: undefined|"unassigned"|adminId, from, to, sort } */
  async list(filters) {
    const { sort } = filters;
    // "All" + urgency: unresolved tickets must come first even if a resolved one is "more critical"
    if (sort === "urgency" && filters.status === "all") {
      const active = await adminTicketRepo.findMany({ filters: { ...filters, status: "active" }, sort, take: LIST_CAP });
      const rest = await adminTicketRepo.findMany({ filters: { ...filters, status: "inactive" }, sort, take: Math.max(0, LIST_CAP - active.length) });
      return [...active, ...rest].map(presentListItem);
    }
    return (await adminTicketRepo.findMany({ filters, sort, take: LIST_CAP })).map(presentListItem);
  },

  async get(id) {
    return presentDetail(await load(id));
  },

  /** patch: { status, category, priority, assigneeId: string|null } (any subset) */
  async update(id, patch, actor) {
    const current = await load(id);
    const data = {};
    let authorVisible = false;

    if (patch.status && patch.status !== current.status) {
      data.status = patch.status;
      if (patch.status === "resolved") data.resolvedAt = new Date();
      else if (patch.status !== "closed") data.resolvedAt = null; // reopened
      authorVisible = true;
    }
    // A manual choice always wins over the AI's: mark the source so the AI's later work can never overwrite it
    if (patch.category && patch.category !== current.category) Object.assign(data, { category: patch.category, categorySource: "admin", categoryReason: null });
    if (patch.priority && patch.priority !== current.priority) Object.assign(data, { priority: patch.priority, prioritySource: "admin", priorityReason: null });

    if ("assigneeId" in patch && patch.assigneeId !== current.assignee?.id) {
      if (patch.assigneeId !== null) {
        const user = await userRepo.findById(patch.assigneeId);
        if (!user || user.role !== "admin") throw AppError.badRequest("Validation failed", [{ field: "assignee", message: "Choose a BookLeaf admin." }]);
      }
      data.assigneeId = patch.assigneeId;
    }

    if (Object.keys(data).length === 0) return presentDetail(current); // nothing actually changed

    // Only a status change is something the author should see as "activity" in their list. Category, priority and
    // assignment are internal, so their last-updated time is passed back unchanged.
    data.updatedAt = authorVisible ? new Date() : current.updatedAt;

    const next = await adminTicketRepo.update(id, data);
    realtimeService.publish(authorVisible ? EVENTS.STATUS : EVENTS.UPDATED, ticketRef(current), authorVisible ? "all" : "staff");
    return presentDetail(next);
  },

  async reply(id, { body, resolve }, actor) {
    const current = await load(id);
    if (current.status === "closed") throw new AppError(409, "TICKET_CLOSED", "This ticket is closed. Reopen it first if you need to reply.");

    const ticketData = { updatedAt: new Date() }; // explicit: the author's list is sorted by it
    if (resolve && current.status !== "resolved") Object.assign(ticketData, { status: "resolved", resolvedAt: new Date() });
    else if (!resolve && current.status === "open") ticketData.status = "in_progress"; // answering a new ticket means someone is on it
    if (!current.assignee) ticketData.assigneeId = actor.id;                          // replying claims an unassigned ticket

    const next = await adminTicketRepo.addReply({ ticketId: id, senderId: actor.id, body, ticketData });
    realtimeService.publish(EVENTS.MESSAGE, ticketRef(current), "all"); // one event covers the reply and any status change
    return presentDetail(next);
  },

  async addNote(id, { body }, actor) {
    await load(id);
    await adminTicketRepo.addNote({ ticketId: id, adminId: actor.id, body });
    const next = await load(id);
    realtimeService.publish(EVENTS.UPDATED, ticketRef(next), "staff");
    return presentDetail(next);
  },

  /** → { body, generatedAt, cached, model, warnings }. Throws 503 AI_UNAVAILABLE when the model can't help. */
  async draft(id, { regenerate }) {
    const t = await load(id);
    return draftReply({
      ticketId: t.id,
      authorName: t.author.name,
      subject: t.subject,
      description: t.description,
      category: t.category,
      book: t.book ? presentBook(t.book) : null,
      recentMessages: t.messages.map((m) => ({ senderRole: m.senderRole, body: m.body })),
    }, { regenerate });
  },
};