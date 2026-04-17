import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5",
        "text-base text-sofi-text outline-none",
        "focus:border-violet-primary",
        "placeholder:text-sofi-text-dim",
        "aria-[invalid=true]:border-sofi-red",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
