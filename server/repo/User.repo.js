import { prisma } from "../config/prisma.js";

export const userRepo = {
  /** Emails are stored lowercase; callers pass them lowercased (the login validator does this). */
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
};