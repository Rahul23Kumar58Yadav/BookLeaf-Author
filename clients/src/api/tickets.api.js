import { http } from "./http";

/**
 * Author-side ticket endpoints. The server scopes everything to the logged-in author.
 * Attachments are UI-only for now: when an upload endpoint exists, switch `create` to FormData.
 */
export const ticketsApi = {
  /** → { tickets: [{ id, subject, status, createdAt, updatedAt, book: {id,title}|null, lastMessage: {senderRole, createdAt}|null }] } */
  list: (opts) => http.get("/tickets", opts),
  /** → { ticket: { ...list fields, description, author:{name}, messages:[...] } }  (never includes internal notes) */
  get: (id, opts) => http.get(`/tickets/${encodeURIComponent(id)}`, opts),
  /** payload: { bookId: string|null, subject, description } → { ticket } */
  create: ({ bookId, subject, description }) => http.post("/tickets", { bookId, subject, description }),
};