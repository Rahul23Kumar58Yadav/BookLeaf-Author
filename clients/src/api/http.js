const BASE = import.meta.env.VITE_API_URL ?? "/api";
export const TOKEN_KEY = "bl-token";

export const API_BASE = BASE;
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Thin fetch wrapper: attaches the JWT, parses JSON, and throws ApiError with the server's message.
 *
 * One AbortController merges two reasons to cancel: the caller's `signal` (page navigated away or a newer
 * request replaced this one) and a timeout, so a hung server can't leave a spinner running forever.
 * Caller aborts rethrow as AbortError (callers ignore those); a timeout becomes a normal, displayable ApiError.
 */
export async function request(path, { method = "GET", body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const token = getToken();

  const ctrl = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  else signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        ...(body && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    });
  } catch (err) {
    if (timedOut) throw new ApiError(0, "TIMEOUT", "The server took too long to respond. Please try again.");
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }

  const data = await res.json().catch(() => null); // empty / non-JSON bodies (204, proxy error pages) → null
  if (res.ok) return data;

  // AuthContext listens for this and signs the user out
  if (res.status === 401) window.dispatchEvent(new Event("auth:expired"));

  const e = data?.error;
  throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? "Something went wrong.", e?.details);
}

export const http = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
};