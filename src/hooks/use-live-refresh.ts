"use client";

import { useEffect, useRef } from "react";

/**
 * Live-update polling interval shared by every surface that silently
 * refreshes itself in the background (customer dashboard, order detail,
 * provider home, provider order list). 25s keeps status changes appearing
 * within half a minute while staying gentle on the API (≈3.5 req/min per
 * open tab, only while the tab is visible).
 */
export const LIVE_REFRESH_INTERVAL_MS = 25_000;

/**
 * `useLiveRefresh` — silent background refetch for live updates.
 *
 * Re-invokes `refetch` every `intervalMs` while the page is visible:
 *  - ticks are skipped while the browser tab is hidden (`document.hidden`),
 *    so background tabs don't burn API calls;
 *  - when the tab becomes visible again, one immediate refetch fires so the
 *    user sees fresh data the moment they return;
 *  - the interval and listener are cleaned up on unmount.
 *
 * The callback is stored in a ref, so the interval is created once and always
 * calls the latest `refetch` — callers can pass an inline closure without
 * re-creating the timer on every render.
 *
 * IMPORTANT: `refetch` must be a silent operation. Callers keep their
 * existing fetch functions (the same ones used for the initial load) and
 * should not flip loading states that would flash skeletons — render guards
 * (e.g. `isLoading && !data`) handle that.
 */
export function useLiveRefresh(
  refetch: () => void,
  intervalMs: number = LIVE_REFRESH_INTERVAL_MS,
  enabled = true
) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.hidden) return;
      refetchRef.current();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        refetchRef.current();
      }
    };

    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
