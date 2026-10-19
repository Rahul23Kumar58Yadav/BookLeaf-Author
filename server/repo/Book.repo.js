import { prisma } from "../config/prisma.js";

/**
 * Data access only: no business rules here.
 * Assumed Prisma model `Book`: id, authorId, title, isbn, genre, publicationDate?, status, mrp?,
 * royaltyPerCopy?, copiesSold, royaltyEarned, royaltyPaid, lastPayoutDate?, printPartner?, availableOn String[]
 */
const include = { author: { select: { id: true, name: true } } };

export const bookRepo = {
  findMany: ({ authorId } = {}) =>
    prisma.book.findMany({
      where: authorId ? { authorId } : undefined,
      include,
      // nulls first so in-production books (no publication date) surface at the top
      orderBy: [{ publicationDate: { sort: "desc", nulls: "first" } }, { title: "asc" }],
    }),

  findById: (id) => prisma.book.findUnique({ where: { id }, include }),
};