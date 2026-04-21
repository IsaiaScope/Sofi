import { useCallback } from "react";

export const ANNOUNCER_ID = "sofi-a11y-announcer";

/**
 * Imperatively announces a message to screen readers via the shared live
 * region mounted at app root (see `<A11yAnnouncer />`). The double-write
 * (clear → next frame → set) is deliberate: SR announcement fires on
 * *change*, so re-posting the same string would otherwise be a no-op.
 */
export function useAnnouncer() {
  return useCallback((message: string) => {
    const el = document.getElementById(ANNOUNCER_ID);
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }, []);
}
