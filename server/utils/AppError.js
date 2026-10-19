/** Operational errors carry an HTTP status + machine-readable code; errorHandler turns them into JSON. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError"; // shows up in logs and stack traces (without it every error just says "Error")
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg = "Invalid request", details) { return new AppError(400, "BAD_REQUEST", msg, details); }
  static unauthorized(msg = "Authentication required") { return new AppError(401, "UNAUTHORIZED", msg); }
  static forbidden(msg = "You don't have access to this resource") { return new AppError(403, "FORBIDDEN", msg); }
  static notFound(msg = "Resource not found") { return new AppError(404, "NOT_FOUND", msg); }
  /** The request is fine on its face but conflicts with current state (e.g. acting on a ticket someone just closed). */
  static conflict(msg = "This conflicts with the current state of the resource") { return new AppError(409, "CONFLICT", msg); }
  /** Well-formed but semantically invalid (valid JSON, impossible request). */
  static unprocessable(msg = "The request can't be processed as sent", details) { return new AppError(422, "UNPROCESSABLE", msg, details); }
  /** A dependency (e.g. the LLM) is down. `code` lets the client tell *what* is unavailable. */
  static unavailable(code = "SERVICE_UNAVAILABLE", msg = "Service temporarily unavailable") { return new AppError(503, code, msg); }
}