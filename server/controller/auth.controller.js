import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Controllers stay thin: take already-validated input, call one service, shape the HTTP response.
 * Business rules live in services.
 *
 * Service contract:
 *   authService.login(email, password) → { token, user }   throws AppError.unauthorized on bad credentials
 *   authService.getUser(userId)        → user              throws AppError.unauthorized if the account is gone
 *   user = { id, name, email, role, authorId }
 */

/** POST /api/auth/login  { email, password } */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  res.json(await authService.login(email, password));
});

/** GET /api/auth/me: confirms the token is still valid and the account still exists. */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: await authService.getUser(req.user.id) });
});