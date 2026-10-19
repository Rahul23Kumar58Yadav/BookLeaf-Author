import { realtimeService } from "../services/realtime.service.js";

export const HEARTBEAT_MS = 25_000;

/**
 * GET /api/events: Server-Sent Events stream.
 *
 * Service contract:
 *   realtimeService.subscribe(user, send) → unsubscribe()
 *     `send(eventName, data)` writes one event to this connection. The service decides which events this
 *     user may see (authors: only their own tickets; admins: all), so scoping is enforced server-side.
 *
 * Operational notes:
 *  - The heartbeat comment keeps proxies and load balancers from closing an idle connection.
 *  - `X-Accel-Buffering: no` stops nginx from buffering the stream; don't put gzip/compression middleware on this route.
 *  - Cleanup on 'close' matters: without it every dropped tab would leak a subscriber and a timer.
 */
export function streamEvents(req, res) {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(": connected\n\n");

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const unsubscribe = realtimeService.subscribe(req.user, send);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}