import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { MAIN_LANDMARK_ID } from "@/lib/a11y";

/**
 * Moves focus to the `<main id="main" tabIndex={-1}>` landmark whenever the
 * route pathname changes. Skips the very first mount (the initial page load
 * already has natural focus on whatever the page puts it on). This is the
 * SPA equivalent of the full-page reload that SRs get on traditional sites.
 */
export function useRouteFocusReset() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFirstRender = useRef(true);
  // pathname is the change-trigger, not a value read inside the effect.
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger-only dep
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const el = document.getElementById(MAIN_LANDMARK_ID);
    el?.focus({ preventScroll: true });
  }, [pathname]);
}
