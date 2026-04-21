import type { ReactNode } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { focusRing } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { type BracketCorner, lBracketStyle } from "@/lib/hud-bracket";

/**
 * Four 40px L-bracket corners with fixed-size (h-14 w-96) content slots.
 *
 * Each corner's bracket color is fixed to match the content's semantic role:
 * top-left = violet (brand), top-right = chrome (calm=cyan, fault=amber),
 * bottom-left = chrome, bottom-right = green (build anchor). This pairing is
 * deliberate — do not make corner colors themeable via props.
 *
 * Slots are optional; omit a slot to leave the L-bracket alone with no content.
 * The host container must be `relative` with `overflow-hidden` and any content
 * meant to sit on top needs z-index ≥ 30 (corners render at z-20).
 */

type Variant = "calm" | "fault";

const CORNER_STYLE = { arm: "40px", thickness: "2px" } as const;

function bracket(corner: BracketCorner, color: string) {
  return lBracketStyle(corner, { ...CORNER_STYLE, color });
}

interface HudCornersProps {
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  /** "calm" = cyan chrome (default). "fault" = amber chrome for error screens. */
  variant?: Variant;
  /** Hide corners below 1344px (AuthShell's default — its card would overlap).
   *  Pass false on surfaces without a centered card. */
  responsive?: boolean;
}

export function HudCorners({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  variant = "calm",
  responsive = true,
}: HudCornersProps) {
  const chromeVar = variant === "fault" ? "var(--color-sofi-orange)" : "var(--color-cyan-accent)";
  const base = cn(
    "pointer-events-none absolute z-20 h-14 w-96 p-3",
    responsive ? "hidden min-[1344px]:flex" : "flex",
  );
  return (
    <>
      <div
        className={cn(base, "top-12 left-12 items-start justify-start")}
        style={bracket("tl", "var(--color-violet-primary)")}
      >
        {topLeft}
      </div>
      <div
        className={cn(
          base,
          "top-12 right-12 items-start justify-end",
          topRight && "pointer-events-auto",
        )}
        style={bracket("tr", chromeVar)}
      >
        {topRight}
      </div>
      <div
        className={cn(base, "bottom-12 left-12 items-end justify-start")}
        style={bracket("bl", chromeVar)}
      >
        {bottomLeft}
      </div>
      <div
        className={cn(base, "right-12 bottom-12 items-end justify-end")}
        style={bracket("br", "var(--color-sofi-green)")}
      >
        {bottomRight}
      </div>
    </>
  );
}

interface ThemeToggleProps {
  variant?: Variant;
}

export function ThemeToggle({ variant = "calm" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";
  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center border transition-colors",
        variant === "fault"
          ? "border-sofi-orange/30 text-sofi-orange hover:border-sofi-orange/80 hover:bg-sofi-orange/10"
          : "border-cyan-accent/30 text-cyan-accent hover:border-cyan-accent/80 hover:bg-cyan-accent/10",
        focusRing(variant === "fault" ? "warning" : "default"),
      )}
    >
      <span aria-hidden="true" className="material-symbols-outlined !text-[18px]">
        {isLight ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}
