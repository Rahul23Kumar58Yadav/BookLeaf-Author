import { logger } from "../utils/logger.js";

export const EVENTS = Object.freeze({
  CREATED: "ticket.created", // a new ticket arrived
  MESSAGE: "ticket.message", // someone replied
  STATUS: "ticket.status",   // status changed
  UPDATED: "ticket.updated", // staff-only changes: classification, priority, assignee, notes
});

const subscribers = new Set(); // { user, send }

/**
 * Who may hear an event. Admins hear everything. An author hears an event only if it concerns their own ticket AND
 * it isn't staff-only. This is the single place real-time visibility is decided, so access rules can't drift.
 */
const canHear = (user, { authorId, audience }) =>
  user.role === "admin" || (audience === "all" && user.authorId === authorId);

/**
 * In-memory fan-out for a single server process. Running several instances needs a shared channel
 * (e.g. Redis pub/sub) behind this same interface; callers wouldn't change.
 */
export const realtimeService = {
  /** → unsubscribe(). Called by the SSE controller; it must call the result when the connection closes. */
  subscribe(user, send) {
    const sub = { user, send };
    subscribers.add(sub);
    return () => subscribers.delete(sub);
  },

  /**
   * ticket: { id, authorId }.  audience: "all" (the ticket's author + admins) | "staff" (admins only).
   * The payload is always just { ticketId }. Clients refetch, so no ticket content ever travels on the stream.
   */
  publish(event, ticket, audience = "all") {
    const target = { authorId: ticket.authorId, audience };
    for (const sub of [...subscribers]) {
      if (!canHear(sub.user, target)) continue;
      try {
        sub.send(event, { ticketId: ticket.id });
      } catch (err) {
        // A dead connection must not stop delivery to everyone else
        logger.error("[realtime] dropping failed subscriber:", err.message);
        subscribers.delete(sub);
      }
    }
  },

  get subscriberCount() { return subscribers.size; },
};