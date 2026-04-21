import { cn } from "@/lib/cn";

// `<main id={MAIN_LANDMARK_ID} tabIndex={-1}>` is the SPA focus target for
// route changes (see `useRouteFocusReset`). Screen readers also expose this
// id as a landmark for quick navigation.
export const MAIN_LANDMARK_ID = "main";

// DOM selector for the "first tabbable thing inside a form-ish container".
// Used by `useAutoFocusForm` and any other mount-time autofocus helper.
// Excludes hidden/disabled/aria-hidden so we don't land focus in a dead spot.
export const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
].join(", ");

// Semantic focus-ring tones. The color is driven by theme tokens
// (`--color-*`), which are redefined under `.light`, so the ring auto-adapts
// to dark/light without any extra logic at the call site.
export type FocusTone = "default" | "primary" | "danger" | "warning" | "success";

// IMPORTANT for Tailwind JIT: these must be full literal class strings (not
// built at runtime) so the compiler emits them. Keep them here; do not template
// the color portion.
const RING_COLORS: Record<FocusTone, string> = {
  default: "focus-visible:outline-cyan-accent",
  primary: "focus-visible:outline-violet-primary",
  danger: "focus-visible:outline-sofi-red",
  warning: "focus-visible:outline-sofi-orange",
  success: "focus-visible:outline-sofi-green",
};

// Base geometry — thickness + offset are decoupled from color so callers can
// mix "thick outline for big CTAs" with any tone.
const GEOMETRY = {
  normal: "focus-visible:outline-2 focus-visible:outline-offset-2",
  thick: "focus-visible:outline-[3px] focus-visible:outline-offset-2",
  // Inset variant for elements inside clipped containers (popovers, cards with
  // overflow-hidden) where an offset ring would get cut off.
  inset: "focus-visible:outline-2 focus-visible:-outline-offset-2",
} as const;

interface FocusRingOptions {
  /** Visual emphasis. Defaults to 2px offset ring. */
  weight?: "normal" | "thick" | "inset";
}

/**
 * Returns a Tailwind class string for a `:focus-visible` outline ring in the
 * requested semantic tone.
 *
 * @example
 *   <button className={cn("bg-violet-primary", focusRing("primary"))}>
 *   <button className={cn("bg-sofi-red/10", focusRing("danger"))}>
 *   <MenuItem className={focusRing("default", { weight: "inset" })}>
 */
export function focusRing(tone: FocusTone = "default", opts: FocusRingOptions = {}): string {
  return cn(GEOMETRY[opts.weight ?? "normal"], RING_COLORS[tone]);
}

// Common presets for non-variant code. Reach for `focusRing()` when a component
// picks its tone at runtime (e.g. a CVA variant map).
export const FOCUS_RING = focusRing("default");
export const FOCUS_RING_INSET = focusRing("default", { weight: "inset" });
