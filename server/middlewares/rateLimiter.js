import rateLimit from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

/** 429s go through the normal error handler, so they have the same JSON shape as every other error. */
const make = ({ windowMs, limit, message, keyGenerator, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs, limit, keyGenerator, skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", message)),
  });

/** Brute-force guard: only *failed* sign-ins count, keyed by IP. Behind a proxy, set `app.set("trust proxy", …)`. */
export const loginLimiter = make({
  windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true,
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
});

/** Stops one account flooding the queue. Keyed by user, so shared office IPs aren't punished. */
export const createTicketLimiter = make({
  windowMs: 60 * 60_000, limit: 20, keyGenerator: (req) => req.user.id,
  message: "You've sent a lot of queries in the last hour. Please wait a little before sending another.",
});

/** Each draft can cost an LLM call, so cap them per admin. Cached drafts are cheap, but regenerate isn't. */
export const draftLimiter = make({
  windowMs: 60_000, limit: 20, keyGenerator: (req) => req.user.id,
  message: "Too many AI draft requests. Give it a moment, or write the reply yourself.",
});