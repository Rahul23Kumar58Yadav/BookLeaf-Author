import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js"; // validated on import: a bad config stops the process here, with a clear message
import { prisma } from "./config/prisma.js";
import { endAllStreams } from "./controllers/events.controller.js";
import { recoverPending, startTicketAiProcessor } from "./jobs/ticketAiProcessor.js";
import { getAiStatus } from "./services/ai/index.js";
import { logger } from "./utils/logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let server = null;
let stopAiProcessor = null;
let recoveryTimer = null;
let shuttingDown = false;

/** Managed databases can take a few seconds to wake or accept connections after a deploy: retry before giving up. */
async function connectDb() {
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$connect();
      return;
    } catch (err) {
      if (attempt >= env.DB_CONNECT_ATTEMPTS) throw err;
      logger.warn(`[db] connection failed (attempt ${attempt}/${env.DB_CONNECT_ATTEMPTS}), retrying in ${env.DB_CONNECT_DELAY_MS}ms: ${err.message}`);
      await sleep(env.DB_CONNECT_DELAY_MS);
    }
  }
}

/**
 * Graceful shutdown: stop taking new work, end the live streams (clients reconnect to the new instance by
 * themselves), let in-flight requests finish within a grace period, then close the database. Safe to call twice.
 * An AI call still running when we stop leaves its ticket "pending", and the next start picks it up.
 */
async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[server] shutting down (${reason})`);

  // Last resort: never hang forever and block a deploy
  setTimeout(() => { logger.error("[server] forced exit: shutdown took too long"); process.exit(1); }, env.SHUTDOWN_GRACE_MS + 5_000).unref();

  clearInterval(recoveryTimer);
  stopAiProcessor?.();

  if (server?.listening) {
    const closed = new Promise((resolve) => server.close(resolve)); // stops accepting; resolves when connections end
    endAllStreams();
    server.closeIdleConnections();
    await Promise.race([closed, sleep(env.SHUTDOWN_GRACE_MS)]);
    server.closeAllConnections(); // anything still open after the grace period is cut
  }

  try { await prisma.$disconnect(); }
  catch (err) { logger.error("[db] disconnect failed:", err.message); }
  process.exit(exitCode);
}

// Registered before anything can fail, so a startup crash also shuts down cleanly.
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// After one of these the process is in an unknown state: log it, finish what we can, exit non-zero so the host restarts us.
process.on("uncaughtException", (err) => { logger.error("[fatal] uncaught exception:", err); shutdown("uncaughtException", 1); });
process.on("unhandledRejection", (err) => { logger.error("[fatal] unhandled rejection:", err); shutdown("unhandledRejection", 1); });

async function start() {
  await connectDb();

  server = http.createServer(createApp());
  server.keepAliveTimeout = 65_000; // longer than the 60s idle timeout typical of load balancers, which avoids sporadic 502s
  server.headersTimeout = 66_000;   // must exceed keepAliveTimeout
  server.requestTimeout = 30_000;   // a client that dribbles a request body for longer than this is dropped

  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(env.PORT, resolve); });

  logger.info(
    `[server] listening on :${env.PORT} (${env.NODE_ENV}) · ` +
    `AI ${getAiStatus().configured ? `on (${env.AI_MODEL})` : "off (keyword rules + manual replies)"} · ` +
    `CORS origins: ${env.CORS_ORIGIN.length}`
  );

  // Classify new tickets in the background, and pick up any a previous run left unclassified.
  stopAiProcessor = startTicketAiProcessor();
  recoveryTimer = setInterval(() => recoverPending().catch((err) => logger.error("[ai] periodic recovery failed:", err)), 5 * 60_000);
  recoveryTimer.unref();
}

start().catch((err) => {
  logger.error("[fatal] startup failed:", err);
  shutdown("startup failure", 1);
});