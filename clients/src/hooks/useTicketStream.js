import { useEffect, useRef, useState } from "react";
import { API_BASE, getToken } from "../api/http";

/**
 * Subscribes to GET /api/events (Server-Sent Events) and calls onEvent({ type, data }).
 *
 * Why fetch instead of EventSource: EventSource can't send an Authorization header, and putting the JWT
 * in the URL would leak it into logs. Reading the response stream ourselves keeps auth in a header.
 *
 * Events the server sends (scoped to the caller's own tickets): `ticket.message`, `ticket.status`,
 * each with data { ticketId }. A synthetic { type: "reconnected" } fires after any reconnect so callers
 * can refetch whatever they missed while offline.
 *
 * Returns `connected` so the UI can show a live/reconnecting indicator.
 */
export function useTicketStream(onEvent) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const ctrl = new AbortController();
    let attempt = 0;
    let firstOpen = true;

    async function connectOnce() {
      const res = await fetch(`${API_BASE}/events`, {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "text/event-stream" },
        signal: ctrl.signal,
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event("auth:expired"));
        return "stop";
      }
      if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);

      attempt = 0;
      setConnected(true);
      if (!firstOpen) handlerRef.current?.({ type: "reconnected" });
      firstOpen = false;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let end;
        while ((end = buffer.indexOf("\n\n")) !== -1) {
          const evt = parseEvent(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
          if (evt) handlerRef.current?.(evt);
        }
      }
    }

    (async () => {
      while (!ctrl.signal.aborted) {
        try {
          if ((await connectOnce()) === "stop") return;
        } catch (err) {
          if (ctrl.signal.aborted) return;
        }
        setConnected(false);
        // Exponential backoff with jitter, capped at 15s
        const delay = Math.min(15000, 1000 * 2 ** attempt++) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    })();

    return () => ctrl.abort();
  }, []);

  return connected;
}

/** Parses one SSE block ("event: x\ndata: {...}"). Comment lines (": ping") are heartbeats and are skipped. */
function parseEvent(block) {
  let type = "message";
  const data = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) type = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  if (!data.length) return null;
  try { return { type, data: JSON.parse(data.join("\n")) }; } catch { return null; }
}