import { ticketAiRepo } from "../repositories/ticketAi.repo.js";
import { classifyTicket } from "../services/ai/index.js";
import { EVENTS, realtimeService } from "../services/realtime.service.js";
import { TICKET_CREATED, bus } from "../utils/bus.js";
import { logger } from "../utils/logger.js";

// Tickets being classified right now. A duplicate event, or startup recovery racing a live job, would otherwise
// classify the same ticket twice: two model calls, two writes, two "updated" events.
const inFlight = new Set();

/**
 * Classifies a ticket after it has been saved. Runs in the background, so ticket creation never waits for
 * (or fails because of) the AI. classifyTicket never throws, so every ticket ends up categorised, by AI or by rules.
 */
export async function processTicket(ticketId) {
  if (inFlight.has(ticketId)) return;
  inFlight.add(ticketId);
  try {
    const ticket = await ticketAiRepo.getForClassification(ticketId);
    if (!ticket || ticket.aiStatus !== "pending") return; // gone, or already handled

    const result = await classifyTicket({
      id: ticket.id, subject: ticket.subject, description: ticket.description, bookStatus: ticket.book?.status ?? null,
    });

    const saved = await ticketAiRepo.saveClassification(ticket.id, result);
    if (saved) realtimeService.publish(EVENTS.UPDATED, { id: ticket.id, authorId: ticket.authorId }, "staff"); // queue refreshes itself
  } finally {
    inFlight.delete(ticketId);
  }
}

/** Pick up tickets that were saved but never classified (the server restarted mid-job). One at a time. */
export async function recoverPending({ olderThanMs = 60_000 } = {}) {
  const stuck = await ticketAiRepo.findStalePending({ olderThanMs });
  for (const { id } of stuck) {
    try { await processTicket(id); }
    catch (err) { logger.error(`[ai] recovery failed for ticket ${id}:`, err); }
  }
  return stuck.length;
}

let listener = null;

/**
 * Call at startup, after the database is reachable. Safe to call twice (the second call is a no-op), and returns
 * a stop function for graceful shutdown.
 */
export function startTicketAiProcessor() {
  if (listener) return stopTicketAiProcessor;
  listener = ({ ticketId }) => {
    processTicket(ticketId).catch((err) => logger.error(`[ai] processing failed for ticket ${ticketId}:`, err));
  };
  bus.on(TICKET_CREATED, listener);
  recoverPending().catch((err) => logger.error("[ai] startup recovery failed:", err));
  return stopTicketAiProcessor;
}

export function stopTicketAiProcessor() {
  if (listener) bus.off(TICKET_CREATED, listener);
  listener = null;
}