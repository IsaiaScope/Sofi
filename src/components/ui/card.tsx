import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Single `variant` enum: neutral surfaces (`surface`/`elevated`/`muted`/`plain`)
// and semantic accents (`primary`/`danger`/`warning`/`success`) are mutually
// exclusive — a card is either a plain shell or a tinted one, never both.
// `hoverable` only adds visual affordance; interactive cards must still set
// their own `role="button"` + `tabIndex` + keyboard handlers.
const cardVariants = cva("rounded-lg", {
  variants: {
    variant: {
      surface: "border border-sofi-border bg-sofi-surface",
      elevated: "border border-sofi-border bg-sofi-elevated",
      muted: "bg-white/[0.03]",
      plain: "",
      primary: "border border-violet-primary/40 bg-violet-primary/5",
      danger: "border border-sofi-red/40 bg-sofi-red/5",
      warning: "border border-sofi-orange/40 bg-sofi-orange/5",
      success: "border border-sofi-green/40 bg-sofi-green/5",
    },
    padding: {
      none: "",
      xs: "p-1",
      sm: "p-2",
      md: "p-3",
      lg: "p-4",
    },
    hoverable: {
      true: "cursor-pointer transition-colors hover:border-white/15",
      false: "",
    },
  },
  defaultVariants: { variant: "surface", padding: "none", hoverable: false },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, hoverable }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";
