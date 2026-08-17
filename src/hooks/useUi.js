import { useEffect, useState } from "react";

/**
 * Shows a skeleton state on the very first visit to a page (per session),
 * then renders instantly on subsequent navigations.
 */
export function useFirstVisitLoading(key, ms = 500) {
  const storageKey = `Pulse-loaded:${key}`;
  const [ready, setReady] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  // Reset when the page key changes (navigation between different pages).
  // Adjusting state during render (guarded and converging) instead of in an
  // effect avoids showing the stale value for one frame.
  const [prevKey, setPrevKey] = useState(storageKey);
  if (prevKey !== storageKey) {
    setPrevKey(storageKey);
    setReady(false);
  }

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* private mode */
      }
      setReady(true);
    }, ms);
    return () => clearTimeout(t);
  }, [ready, ms, storageKey]);

  return ready;
}
