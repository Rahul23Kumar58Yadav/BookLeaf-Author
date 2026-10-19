import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth.api";
import { TOKEN_KEY, clearToken, getToken, setToken } from "../api/http";

export const AuthContext = createContext(null);

/**
 * Owns the session: who is logged in, and whether we're still finding out.
 *
 * Token storage: localStorage. It's simple and lets the SSE stream send an Authorization header,
 * but it is readable by any script on the page, so the app must stay free of XSS (React escapes by default,
 * and nothing here uses dangerouslySetInnerHTML). A production system would move to an httpOnly cookie.
 * The token is never trusted on its own: we always confirm it with GET /auth/me before showing protected pages.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // With no stored token there is nothing to verify, so we start out already "loaded"
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  /** Ask the server who the stored token belongs to. Only a *rejected* token ends the session. */
  const loadUser = useCallback(async (signal) => {
    try {
      const { user: me } = await authApi.me({ signal });
      setUser(me);
    } catch (err) {
      if (err.name === "AbortError") return;
      if (err.status === 401) {
        clearToken();
        setUser(null);
      }
      // Network/server trouble: leave the token alone so a reload can retry, and don't log anyone out for a blip
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // Restore the session on first load
  useEffect(() => {
    if (!getToken()) return;
    const ctrl = new AbortController();
    loadUser(ctrl.signal);
    return () => ctrl.abort();
  }, [loadUser]);

  // The API layer fires this on any 401 (expired token, revoked access): drop the session everywhere
  useEffect(() => {
    const onExpired = () => {
      clearToken();
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  // Keep tabs in sync: logging out (or in) in one tab is reflected in the others
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== TOKEN_KEY) return;
      if (!e.newValue) setUser(null);
      else loadUser();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadUser]);

  /** Throws the server's ApiError (e.g. "Incorrect email or password") so the login form can show it. */
  const login = useCallback(async (email, password) => {
    const { token, user: me } = await authApi.login(email.trim().toLowerCase(), password);
    setToken(token); // before setUser, so requests fired by the newly rendered pages are already authenticated
    setUser(me);
    setLoading(false);
    return me;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null); // ProtectedRoute notices and redirects to /login
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === "admin", login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}