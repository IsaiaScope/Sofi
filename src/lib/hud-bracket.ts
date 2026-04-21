import type { CSSProperties } from "react";

export type BracketCorner = "tl" | "tr" | "bl" | "br";

interface BracketOptions {
  /** Length of each arm (e.g. "40px"). */
  arm: string;
  /** Stroke width (e.g. "2px"). */
  thickness: string;
  /** CSS color or var reference for the stroke. */
  color: string;
}

/**
 * Inline style for a single L-bracket corner, painted via two layered
 * linear gradients with hard color stops. Shared by HudCorners (40px arms
 * anchoring the viewport) and BracketGlyph (12px arms ringing an icon).
 */
export function lBracketStyle(
  corner: BracketCorner,
  { arm, thickness, color }: BracketOptions,
): CSSProperties {
  const isTop = corner[0] === "t";
  const isLeft = corner[1] === "l";
  const horDir = isLeft ? "to right" : "to left";
  const verDir = isTop ? "to bottom" : "to top";
  const anchor = `${isTop ? "top" : "bottom"} ${isLeft ? "left" : "right"}`;
  return {
    backgroundImage: `linear-gradient(${horDir}, ${color} ${arm}, transparent ${arm}), linear-gradient(${verDir}, ${color} ${arm}, transparent ${arm})`,
    backgroundSize: `100% ${thickness}, ${thickness} 100%`,
    backgroundPosition: `${anchor}, ${anchor}`,
    backgroundRepeat: "no-repeat",
  };
}
