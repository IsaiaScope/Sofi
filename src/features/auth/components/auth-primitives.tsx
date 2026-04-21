import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field";
import { Heading } from "@/components/ui/heading";
import { focusRing } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { lBracketStyle } from "@/lib/hud-bracket";

export const TERMINAL_INPUT_CLASS =
  "rounded-none border-cyan-accent/30 bg-[var(--sofi-input-tint)] font-mono px-4 py-3 focus:border-cyan-accent focus:bg-[var(--sofi-input-tint-focus)]";

export const AUTH_FOOTER_LINK_CLASS = cn(
  "rounded-sm text-cyan-accent transition-colors hover:text-cyan-hover hover:underline",
  focusRing("default"),
);

interface AuthHeadingProps {
  children: ReactNode;
  /** Defaults to "left" for form screens. Use "center" for non-form screens (e.g., verify-success). */
  align?: "left" | "center";
}

export function AuthHeading({ children, align = "left" }: AuthHeadingProps) {
  return (
    <Heading size="display" tone="primary" align={align} className="mb-6">
      {children}
    </Heading>
  );
}

interface AuthFieldLabelProps {
  /** Material Symbols icon name (e.g., "mail", "lock", "badge"). */
  icon: string;
  children: ReactNode;
}

export function AuthFieldLabel({ icon, children }: AuthFieldLabelProps) {
  return (
    <FieldLabel className="flex items-center gap-2 text-cyan-accent">
      <span aria-hidden="true" className="material-symbols-outlined !text-[18px]">
        {icon}
      </span>
      {children}
    </FieldLabel>
  );
}

const AUTH_BUTTON_BASE =
  "flex w-full items-center justify-center gap-2 py-4 font-mono text-base font-bold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const AUTH_BUTTON_SOLID = cn(
  "border border-transparent bg-violet-primary text-white hover:border-violet-hover hover:bg-violet-hover",
  focusRing("primary"),
);

const AUTH_BUTTON_OUTLINE = cn(
  "border border-cyan-accent bg-transparent text-cyan-accent hover:bg-cyan-accent/10",
  focusRing("default"),
);

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Material Symbols icon name. */
  icon?: string;
  /** Where to render the icon relative to the label. Defaults to "leading". */
  iconPosition?: "leading" | "trailing";
}

function renderButtonContent(
  icon: string | undefined,
  iconPosition: "leading" | "trailing",
  children: ReactNode,
) {
  const iconEl = icon ? (
    <span aria-hidden="true" className="material-symbols-outlined !text-[20px]">
      {icon}
    </span>
  ) : null;
  return (
    <>
      {iconPosition === "leading" && iconEl}
      {children}
      {iconPosition === "trailing" && iconEl}
    </>
  );
}

function createAuthButton(
  displayName: string,
  variantClass: string,
  defaultType: "submit" | "button",
) {
  const Component = forwardRef<HTMLButtonElement, AuthButtonProps>(
    (
      { children, className, icon, iconPosition = "leading", type = defaultType, ...props },
      ref,
    ) => (
      <button
        ref={ref}
        type={type}
        className={cn(AUTH_BUTTON_BASE, variantClass, className)}
        {...props}
      >
        {renderButtonContent(icon, iconPosition, children)}
      </button>
    ),
  );
  Component.displayName = displayName;
  return Component;
}

// Primary action (violet, submits by default).
export const AuthSubmitButton = createAuthButton("AuthSubmitButton", AUTH_BUTTON_SOLID, "submit");

// Secondary action (cyan outline, nav by default).
export const AuthOutlineButton = createAuthButton(
  "AuthOutlineButton",
  AUTH_BUTTON_OUTLINE,
  "button",
);

const GLYPH_STYLE = { arm: "12px", thickness: "2px" } as const;
const GLYPH_CORNERS = ["tl", "tr", "bl", "br"] as const;

interface BracketGlyphProps {
  /** Material Symbols icon name (e.g., "check", "mail", "error"). */
  icon: string;
  /** CSS color for brackets + icon. Defaults to the cyan accent. */
  color?: string;
  /** Accessible label; falls back to the icon name. */
  label?: string;
}

export function BracketGlyph({
  icon,
  color = "var(--color-cyan-accent)",
  label,
}: BracketGlyphProps) {
  return (
    <div
      role="img"
      aria-label={label ?? icon}
      className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center"
    >
      {GLYPH_CORNERS.map((corner) => (
        <div
          key={corner}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={lBracketStyle(corner, { ...GLYPH_STYLE, color })}
        />
      ))}
      <span aria-hidden="true" className="material-symbols-outlined !text-[28px]" style={{ color }}>
        {icon}
      </span>
    </div>
  );
}
