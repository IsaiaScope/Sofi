import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Tones are semantic so they line up with Button/Card vocabulary. `success-muted`
// is the "resolved/done" treatment (10% bg, 60% fg) used by dimmed task states.
// Accessibility: Badge renders a plain span — if the tone conveys status to
// sighted users, callers must supply a text label or aria-label for AT users.
const badgeVariants = cva("inline-flex items-center justify-center rounded-full", {
  variants: {
    tone: {
      neutral: "bg-white/5 text-sofi-text-dim",
      muted: "bg-sofi-elevated text-sofi-text-muted",
      primary: "bg-violet-muted text-violet-hover",
      success: "bg-sofi-green/20 text-sofi-green",
      "success-muted": "bg-sofi-green/10 text-sofi-green/60",
      warning: "bg-sofi-orange/20 text-sofi-orange",
      danger: "bg-sofi-red/20 text-sofi-red",
      accent: "bg-cyan-muted text-cyan-accent",
    },
    size: {
      xs: "h-4 min-w-4 px-1 text-caption",
      sm: "px-2 py-0.5 text-caption",
      md: "gap-1.5 px-2.5 py-1 text-base",
    },
    font: {
      label: "font-label font-medium",
      mono: "font-mono",
    },
  },
  defaultVariants: { tone: "neutral", size: "sm" },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, font, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, size, font }), className)} {...props} />
  ),
);
Badge.displayName = "Badge";
