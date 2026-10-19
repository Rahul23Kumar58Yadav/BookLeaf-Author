import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { draftLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import {
  draftBody, listTicketsQuery, noteBody, replyBody, ticketIdParams, updateTicketBody,
} from "../validators/admin.ticket.schema.js";
import {
  addTicketNote, draftReply, getTicket, listTickets, replyToTicket, updateTicket,
} from "../controllers/admin.tickets.controller.js";

const router = Router();

router.use(authenticate, requireRole("admin")); // one guard for the whole router: new routes are protected by default

const params = validate({ params: ticketIdParams });

router.get("/", validate({ query: listTicketsQuery }), listTickets);
router.get("/:id", params, getTicket);
router.patch("/:id", params, validate({ body: updateTicketBody }), updateTicket);
router.post("/:id/messages", params, validate({ body: replyBody }), replyToTicket);
router.post("/:id/notes", params, validate({ body: noteBody }), addTicketNote);
router.post("/:id/draft", params, draftLimiter, validate({ body: draftBody }), draftReply); // LLM cost → rate-limited

export default router;