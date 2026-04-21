import { useEffect, useRef } from "react";
import { FOCUSABLE_SELECTOR } from "@/lib/a11y";

/**
 * Focuses the first focusable input inside a form on mount — unless the user
 * has already focused something inside (or the form has an explicit [autofocus]
 * descendant, which the browser already handled). Non-destructive: bails out
 * cleanly if the ref is detached or the form has no focusable fields.
 */
export function useAutoFocusForm<T extends HTMLElement = HTMLFormElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.contains(document.activeElement)) return;
    if (el.querySelector("[autofocus]")) return;
    const first = el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus({ preventScroll: true });
  }, []);
  return ref;
}
