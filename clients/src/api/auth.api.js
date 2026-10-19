import { http } from "./http";

export const authApi = {
  /** → { token, user: { id, name, email, role: "author"|"admin", authorId: string|null } } */
  login: (email, password) => http.post("/auth/login", { email, password }),
  /** Validates the stored token and returns the current user → { user } (401 if the token is bad or expired) */
  me: (opts) => http.get("/auth/me", opts),
};