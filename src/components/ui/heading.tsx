import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// `level` picks the HTML tag (h1–h6) — choose it for document outline. `size`
// is the visual rung, decoupled so a subsection can stay an `<h3>` while looking
// like a body label. Always renders `font-heading` so the family choice is
// centralized.
const headingVariants = cva("font-heading", {
  variants: {
    size: {
      sm: "text-lg font-semibold",
      md: "text-xl font-semibold",
      lg: "text-2xl font-semibold",
      display: "text-2xl font-black uppercase tracking-widest md:text-3xl",
    },
    tone: {
      default: "text-sofi-text",
      muted: "text-sofi-text-muted",
      danger: "text-sofi-red",
      primary: "text-violet-primary",
      inverse: "text-white",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: { size: "sm", tone: "default" },
});

const HEADING_TAGS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

type HeadingLevel = keyof typeof HEADING_TAGS;

export interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /** Semantic heading level (h1–h6). Defaults to 2. */
  level?: HeadingLevel;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 2, size, tone, align, ...props }, ref) => {
    const Tag = HEADING_TAGS[level];
    return (
      <Tag ref={ref} className={cn(headingVariants({ size, tone, align }), className)} {...props} />
    );
  },
);
Heading.displayName = "Heading";
