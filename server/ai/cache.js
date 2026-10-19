import { createHash } from "node:crypto";

/** Lowercase + collapse whitespace, so trivially different copies of the same text share a cache key. */
export const normalize = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Stable fingerprint of any number of inputs (a NUL separator stops "ab"+"c" colliding with "a"+"bc"). */
export const sha256 = (...parts) => createHash("sha256").update(parts.map(String).join("\u0000")).digest("hex");

/**
 * Small in-memory LRU with expiry. Used for classification: identical tickets (a resubmit, a copy-paste
 * from the same author) shouldn't cost a second model call. In-memory is deliberate: it needs no infrastructure,
 * and losing it on restart only costs a few repeat calls. Draft caching is different: drafts live in the database.
 */
export function createCache({ max = 500, ttlMs = 24 * 3_600_000, now = Date.now } = {}) {
  const store = new Map(); // Map iterates in insertion order, so the first key is the least recently used

  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expires <= now()) { store.delete(key); return undefined; }
      store.delete(key); store.set(key, hit); // refresh recency
      return hit.value;
    },
    set(key, value) {
      store.delete(key);
      store.set(key, { value, expires: now() + ttlMs });
      if (store.size > max) store.delete(store.keys().next().value);
    },
    clear: () => store.clear(),
    get size() { return store.size; },
  };
}

export const classificationCache = createCache();