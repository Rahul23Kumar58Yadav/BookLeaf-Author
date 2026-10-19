import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetch-on-mount with cancellation.
 *  reload()   full reload: shows the loading state
 *  refresh()  silent reload: keeps current data on screen (used by real-time updates)
 *  setData()  replace data directly, e.g. with the response of a PATCH
 * A newer request always aborts the previous one, so out-of-order responses can't overwrite fresh data.
 */
export function useResource(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const ctrlRef = useRef(null);

  const run = useCallback(async ({ silent = false } = {}) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const data = await fetcherRef.current(ctrl.signal);
      if (!ctrl.signal.aborted) setState({ data, loading: false, error: null });
    } catch (error) {
      if (error.name === "AbortError" || ctrl.signal.aborted) return;
      // A failed background refresh must not blank a screen the user is reading
      setState((s) => (silent ? s : { data: null, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    run();
    return () => ctrlRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  /** Replace data locally, e.g. with the ticket a PATCH just returned. */
  const mutate = useCallback((next) => setState((s) => ({ ...s, data: typeof next === "function" ? next(s.data) : next })), []);

  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  const reload = useCallback(() => run(), [run]);
  const refresh = useCallback(() => run({ silent: true }), [run]);
  return { ...state, reload, refresh, mutate };
}