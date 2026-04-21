import { forwardRef } from "react";
import { FOCUS_RING } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { useFieldContext } from "./field";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (
    { className, id, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, ...props },
    ref,
  ) => {
    const field = useFieldContext();
    return (
      <input
        ref={ref}
        id={id ?? field?.id}
        aria-describedby={ariaDescribedBy ?? (field?.hasError ? field.errorId : undefined)}
        aria-invalid={ariaInvalid ?? (field?.hasError ? true : undefined)}
        className={cn(
          "w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5",
          "text-base text-sofi-text outline-none",
          "focus:border-violet-primary",
          FOCUS_RING,
          "placeholder:text-sofi-text-dim",
          "aria-[invalid=true]:border-sofi-red",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
