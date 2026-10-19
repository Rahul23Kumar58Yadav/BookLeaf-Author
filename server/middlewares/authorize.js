import { AppError } from "../utils/AppError.js";

/** Use after authenticate: requireRole("admin"). 403 means "known user, wrong role". */
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(AppError.forbidden());