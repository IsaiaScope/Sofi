import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { focusRing } from "@/lib/a11y";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors text-base disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: cn("bg-violet-primary text-white hover:bg-violet-hover", focusRing("primary")),
        outline: cn(
          "border border-sofi-border bg-transparent text-sofi-text-muted hover:bg-sofi-elevated hover:text-sofi-text",
          focusRing("default"),
        ),
        ghost: cn(
          "bg-transparent text-sofi-text-muted hover:bg-white/5 hover:text-sofi-text",
          focusRing("default"),
        ),
        danger: cn("bg-sofi-red/10 text-sofi-red hover:bg-sofi-red/20", focusRing("danger")),
        success: cn(
          "bg-sofi-green/15 text-sofi-green hover:bg-sofi-green/25",
          focusRing("success"),
        ),
      },
      size: {
        sm: "px-3 py-1.5",
        md: "px-4 py-2.5",
        lg: "w-full py-2.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
