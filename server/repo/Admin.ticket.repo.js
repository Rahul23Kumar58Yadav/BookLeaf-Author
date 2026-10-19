import { prisma } from "../config/prisma.js";

const adminRef = { select: { id: true, name: true } };

const listSelect = {
  id: true, number: true, subject: true, status: true,
  category: true, categorySource: true, priority: true, prioritySource: true, aiStatus: true,
  createdAt: true, updatedAt: true,
  author: { select: { id: true, name: true } },
  book: { select: { id: true, title: true } },
  assignee: adminRef,
  messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderRole: true, createdAt: true } },
};

/** Everything an admin sees on one ticket, including internal notes and the AI's reasons. Admin-only: never reuse for authors. */
const detailSelect = {
  ...listSelect,
  description: true, categoryReason: true, priorityReason: true, resolvedAt: true,
  author: { select: { id: true, name: true, email: true } },
  book: { include: { author: { select: { id: true, name: true } } } }, // the full snapshot, same shape presentBook() expects
  messages: { orderBy: { createdAt: "asc" }, select: { id: true, senderRole: true, body: true, createdAt: true, sender: { select: { name: true } } } },
  notes: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, admin: { select: { name: true } } } },
};

const DAY_MS = 86_400_000;

/**
 * Filters → Prisma `where`. status: active (open + in progress) | inactive (resolved + closed) | all | a single status.
 * Dates are UTC calendar days; `to` is inclusive of the whole day. (An admin in IST sees days shifted by 5½ hours.)
 */
export function buildWhere({ status, category, priority, assignee, from, to } = {}) {
  const where = {};
  if (status === "active") where.status = { in: ["open", "in_progress"] };
  else if (status === "inactive") where.status = { in: ["resolved", "closed"] };
  else if (status && status !== "all") where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (assignee === "unassigned") where.assigneeId = null;
  else if (assignee) where.assigneeId = assignee;
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
      ...(to && { lt: new Date(Date.parse(`${to}T00:00:00.000Z`) + DAY_MS) }),
    };
  }
  return where;
}

/**
 * urgency = priority (critical first), then oldest first. This relies on the TicketPriority enum being declared
 * critical, high, medium, low: Postgres sorts enums by declaration order, not alphabetically.
 * Unscored tickets (AI still working) sort last.
 */
export function buildOrder(sort = "urgency") {
  if (sort === "oldest") return [{ createdAt: "asc" }];
  if (sort === "newest") return [{ createdAt: "desc" }];
  return [{ priority: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }];
}

export const adminTicketRepo = {
  findMany: ({ filters, sort, take }) =>
    prisma.ticket.findMany({ where: buildWhere(filters), orderBy: buildOrder(sort), take, select: listSelect }),

  findDetail: (id) => prisma.ticket.findUnique({ where: { id }, select: detailSelect }),

  update: (id, data) => prisma.ticket.update({ where: { id }, data, select: detailSelect }),

  /** Message + ticket update in one transaction: a reply is never saved without the status/assignee change that goes with it. */
  addReply: ({ ticketId, senderId, body, ticketData }) =>
    prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({ data: { ticketId, senderId, senderRole: "admin", body } });
      return tx.ticket.update({ where: { id: ticketId }, data: ticketData, select: detailSelect });
    }),

  /** Notes don't touch the ticket row, so the author's "last updated" never moves because of staff-only chatter. */
  addNote: ({ ticketId, adminId, body }) => prisma.internalNote.create({ data: { ticketId, adminId, body } }),
};