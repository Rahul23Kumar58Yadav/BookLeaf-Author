import { ROLES } from "../config/constants.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";

/**
 * Requires `Authorization: Bearer <jwt>` and sets req.user = { id, role, authorId }.
 * Everything downstream trusts req.user and nothing the client puts in a body or query string.
 * (Stateless: a revoked account stays valid until its token expires. GET /auth/me re-checks the database.)
 */
export function authenticate(req, _res, next) {
  const [scheme, token] = (req.get("authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return next(AppError.unauthorized());

  try {
    const claims = verifyToken(token);
    if (!claims.sub || !Object.values(ROLES).includes(claims.role)) throw new Error("malformed claims");
    req.user = { id: claims.sub, role: claims.role, authorId: claims.authorId ?? null };
    next();
  } catch (err) {
    next(AppError.unauthorized(err.name === "TokenExpiredError"
      ? "Your session has expired. Please sign in again."
      : "Invalid authentication token."));
  }
}