import { http } from "./http";

/**
 * Admin-side ticket endpoints (role: admin).
 *
 * list params: status (active|open|in_progress|resolved|closed|all), category, priority,
 *              assignee (me|unassigned|<adminId>), from, to (YYYY-MM-DD, on createdAt), sort (urgency|oldest|newest)
 *   → { tickets: [{ id, subject, status, category, categorySource, priority, prioritySource, aiStatus,
 *                   createdAt, updatedAt, author:{id,name}, book:{id,title}|null, assignee:{id,name}|null,
 *                   lastMessage:{senderRole,createdAt}|null }] }
 */
export const adminTicketsApi = {
  list: (query, opts) => http.get(`/admin/tickets${query ? `?${query}` : ""}`, opts),

  /** → { ticket } with author, full book snapshot, messages, internal notes, AI reasons */
  get: (id, opts) => http.get(`/admin/tickets/${encodeURIComponent(id)}`, opts),

  /** patch: any of { status, category, priority, assignee: "me" | null } → { ticket } */
  update: (id, patch) => http.patch(`/admin/tickets/${encodeURIComponent(id)}`, patch),

  /** { body, resolve? } → { ticket }. `resolve` also moves the ticket to Resolved. */
  reply: (id, payload) => http.post(`/admin/tickets/${encodeURIComponent(id)}/messages`, payload),

  /** { body } → { ticket } */
  addNote: (id, payload) => http.post(`/admin/tickets/${encodeURIComponent(id)}/notes`, payload),

  /**
   * AI draft for the reply editor. The server caches per ticket; { regenerate: true } bypasses the cache.
   * → { draft: { body, generatedAt, cached } }, or 503 { error: { code: "AI_UNAVAILABLE" } } when the model is down.
   */
  draft: (id, { regenerate = false } = {}, opts) =>
    http.post(`/admin/tickets/${encodeURIComponent(id)}/draft`, { regenerate }, opts),
};