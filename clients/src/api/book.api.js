import { http } from "./http";

export const booksApi = {
  /** → { books: Book[], summary } (scoped to the logged-in author by the server) */
  list: (opts) => http.get("/books", opts),
  /** → { book } */
  get: (id, opts) => http.get(`/books/${encodeURIComponent(id)}`, opts),
};