import { forwardRef, useState } from "react";
import { FOCUS_RING } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { Input } from "./input";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const label = show ? "Hide password" : "Show password";
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={label}
          aria-pressed={show}
          title={label}
          className={cn(
            "absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-sofi-text-muted transition-colors hover:bg-sofi-elevated hover:text-sofi-text",
            FOCUS_RING,
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined !text-[20px]">
            {show ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
