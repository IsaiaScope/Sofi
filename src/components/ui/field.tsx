import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  children: ReactNode;
  className?: string;
}

export function Field({ children, className }: FieldProps) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}

interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function FieldLabel({ children, className, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn(
        "block text-base font-semibold uppercase tracking-wider text-sofi-text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

interface FieldErrorProps {
  children?: ReactNode;
  className?: string;
}

export function FieldError({ children, className }: FieldErrorProps) {
  if (!children) return null;
  return <p className={cn("text-base text-sofi-red", className)}>{children}</p>;
}
