import { prisma } from "../config/prisma.js";

/**
 * Author-facing queries use `select`, never `include`: they name exactly what an author may receive.
 * Category, priority, AI reasons, assignee, internal notes and drafts are never even loaded here, so a presenter
 * bug can't leak them.
 */
const bookRef = { select: { id: true, title: true } };

const listSelect = {
  id: true, number: true, subject: true, status: true, createdAt: true, updatedAt: true,
  book: bookRef,
  // Only the newest message: enough for "BookLeaf replied 2 hours ago" without loading whole conversations
  messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderRole: true, createdAt: true } },
};

const detailSelect = {
  id: true, number: true, subject: true, description: true, status: true, authorId: true,
  createdAt: true, updatedAt: true,
  book: bookRef,
  author: { select: { name: true } },
  messages: { orderBy: { createdAt: "asc" }, select: { id: true, senderRole: true, body: true, createdAt: true } },
};

export const ticketRepo = {
  findManyByAuthor: (authorId) =>
    prisma.ticket.findMany({ where: { authorId }, orderBy: { updatedAt: "desc" }, select: listSelect }),

  findDetailById: (id) => prisma.ticket.findUnique({ where: { id }, select: detailSelect }),

  /** aiStatus defaults to "pending" in the schema; the classifier picks the ticket up afterwards. */
  create: (data) => prisma.ticket.create({ data, select: detailSelect }),

  /** Same author, same text, recently: the signature of a retry after a timeout or a double-click. */
  findRecentDuplicate: ({ authorId, bookId, subject, description, since }) =>
    prisma.ticket.findFirst({
      where: { authorId, bookId, subject, description, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: detailSelect,
    }),
};