import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { createTicketLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { createTicketBody, ticketIdParams } from "../validators/ticket.schema.js";
import { createTicket, getTicket, listTickets } from "../controllers/tickets.controller.js";

const router = Router();

// Author-only. Admins use /api/admin/tickets, and a clear 403 beats an empty list.
router.use(authenticate, requireRole("author"));

router.get("/", listTickets);
router.post("/", createTicketLimiter, validate({ body: createTicketBody }), createTicket);
router.get("/:id", validate({ params: ticketIdParams }), getTicket);

export default router;