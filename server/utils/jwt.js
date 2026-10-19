import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// The algorithm is pinned on both sides so a token can't pick its own ("alg: none" / algorithm-confusion attacks)
const ALG = "HS256";

/** The token carries just enough to authorise a request; names/emails come from GET /auth/me. */
export function signToken(user) {
  return jwt.sign(
    { role: user.role, authorId: user.authorId ?? null },
    env.JWT_SECRET,
    { subject: user.id, algorithm: ALG, expiresIn: env.JWT_EXPIRES_IN }
  );
}

/** Throws jsonwebtoken's TokenExpiredError / JsonWebTokenError on anything wrong. */
export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: [ALG] });