import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

/** Mount after all routes: unknown URLs become a JSON 404 instead of Express's HTML page. */
export const notFoundHandler = (req, _res, next) =>
  next(AppError.notFound(`No route for ${req.method} ${req.path}`));

/**
 * One place that turns any error into { error: { code, message, details? } }.
 * Known errors keep their status. Anything unexpected becomes a generic 500: the real error is logged
 * server-side and never sent to the client (no stack traces, no SQL, no file paths).
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err); // e.g. a failure mid-stream: let Express close the connection

  let status, code, message, details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.type === "entity.parse.failed") {
    [status, code, message] = [400, "BAD_JSON", "The request body isn't valid JSON."];
  } else if (err.type === "entity.too.large") {
    [status, code, message] = [413, "PAYLOAD_TOO_LARGE", "The request body is too large."];
  } else if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500 && err.expose) {
    // Other client mistakes raised by body-parser / http-errors (e.g. 415 unsupported charset or encoding,
    // 400 aborted request). These are not our fault, so they must not be reported as 500s or logged as errors.
    status = err.status;
    code = String(err.type ?? "BAD_REQUEST").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    message = status === 415
      ? "Unsupported content type, charset or encoding. Send UTF-8 JSON."
      : "The request couldn't be processed.";
  } else {
    logger.error(`[${req.method} ${req.originalUrl}]`, err);
    [status, code, message] = [500, "INTERNAL", "Something went wrong on our side. Please try again."];
  }

  res.status(status).json({ error: { code, message, ...(details && { details }) } });
}