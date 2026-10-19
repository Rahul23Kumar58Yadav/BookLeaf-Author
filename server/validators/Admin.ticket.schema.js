import { z } from "zod";
import { CATEGORIES, PRIORITIES, TICKET_STATUSES } from "../config/constants.js";
import { idString, text } from "./common.js";

const status = z.enum(TICKET_STATUSES);
const priority = z.enum(PRIORITIES);
const category = z.enum(CATEGORIES);

/** YYYY-MM-DD that is also a real calendar date (rejects 2026-13-45, 2026-02-30). */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s); }, "Not a real date");

export const ticketIdParams = z.object({ id: idString() });

export const listTicketsQuery = z.object({
  status: z.enum(["active", "all", ...TICKET_STATUSES]).default("active"),
  category: category.optional(),
  priority: priority.optional(),
  assignee: z.union([z.enum(["me", "unassigned"]), idString()]).optional(),
  from: day.optional(),
  to: day.optional(),
  sort: z.enum(["urgency", "oldest", "newest"]).default("urgency"),
}).refine((q) => !q.from || !q.to || q.from <= q.to, { path: ["from"], message: "The start date must be on or before the end date." });

export const updateTicketBody = z.object({
  status: status.optional(),
  category: category.optional(),
  priority: priority.optional(),
  assignee: z.union([z.literal("me"), idString(), z.null()]).optional(), // null = unassign
}).refine((b) => Object.values(b).some((v) => v !== undefined), { message: "Nothing to update." });

const message = (what) => text(
  z.string({ required_error: `Write ${what} first.`, invalid_type_error: `Write ${what} first.` })
    .trim().min(1, `Write ${what} first.`).max(5000, "Please keep it under 5000 characters.")
);

export const replyBody = z.object({ body: message("a reply"), resolve: z.boolean().default(false) });
export const noteBody = z.object({ body: message("a note") });
export const draftBody = z.object({ regenerate: z.boolean().default(false) });