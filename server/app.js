import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import api from "./routes/index.js";

/**
 * Builds the Express app. It does not listen or touch the database, so tests (and server.js) can use it as is.
 *
 * Order matters:
 *  1. request id + logging first, so even rejected requests are recorded
 *  2. security headers
 *  3. CORS before everything that can fail, so error responses also carry CORS headers: without them the browser
 *     hides a 401/429/500 behind an opaque "network error"
 *  4. body parsing, then routes, then 404, then the error handler (always last)
 */
export function createApp() {
  const app = express();

  // Only trust X-Forwarded-For when we really sit behind that many proxies; otherwise anyone could spoof their IP
  // and dodge the login rate limit.
  if (env.TRUST_PROXY) app.set("trust proxy", env.TRUST_PROXY);

  app.use(requestLogger);
  app.use(helmet()); // also removes the X-Powered-By header

  const allowed = new Set(env.CORS_ORIGIN);
  app.use(cors({
    // Requests with no Origin header (curl, server-to-server, same-origin) are not browser cross-origin calls.
    origin: (origin, done) => done(null, !origin || allowed.has("*") || allowed.has(origin)),
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // the JWT travels in a header, not a cookie, so there is no CSRF surface
    exposedHeaders: ["Retry-After", "RateLimit", "RateLimit-Policy", "X-Request-Id", "Location"],
    maxAge: 600, // browsers may cache the preflight answer for 10 minutes
  }));

  // Everything here is per-user data. Stop browsers and shared proxies from storing it. (The event stream sets its own.)
  app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

  app.use(express.json({ limit: "100kb" })); // a ticket is at most 2000 characters; this is generous, not unbounded

  app.get("/", (_req, res) => res.json({ service: "bookleaf-support-api", status: "ok" })); // hosts often probe "/"
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}