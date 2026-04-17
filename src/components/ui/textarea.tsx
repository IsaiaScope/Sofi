import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5",
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
Textarea.displayName = "Textarea";

export { Textarea };
