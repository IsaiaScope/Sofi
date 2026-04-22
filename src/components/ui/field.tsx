import { createContext, type ReactNode, useContext, useId, useMemo } from "react";
import { cn } from "@/lib/cn";

// Children's explicit props (id/htmlFor/aria-describedby/aria-invalid) still
// override context so the primitives keep working standalone outside a <Field>.

interface FieldContextValue {
  id: string;
  errorId: string;
  hasError: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

interface FieldProps {
  children: ReactNode;
  className?: string;
  /** When truthy, renders a <FieldError> after children and marks the control
   *  invalid (aria-invalid=true, aria-describedby=errorId). */
  error?: string;
}

export function Field({ children, className, error }: FieldProps) {
  const reactId = useId();
  const hasError = !!error;
  const value = useMemo<FieldContextValue>(
    () => ({ id: reactId, errorId: `${reactId}-error`, hasError }),
    [reactId, hasError],
  );
  return (
    <FieldContext.Provider value={value}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        {children}
        {error && <FieldError>{error}</FieldError>}
      </div>
    </FieldContext.Provider>
  );
}

interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function FieldLabel({ children, className, htmlFor, ...props }: FieldLabelProps) {
  const field = useFieldContext();
  return (
    <label
      htmlFor={htmlFor ?? field?.id}
      className={cn(
        "block font-semibold text-base text-sofi-text-muted uppercase tracking-wider",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

// role="alert" + aria-live="polite" makes screen readers announce the message
// when it appears or changes. "polite" avoids interrupting an active narration
// (a user typing into the field) — "assertive" would cut them off mid-word.
export function FieldError({ children, className, id, ...props }: FieldErrorProps) {
  const field = useFieldContext();
  if (!children) return null;
  return (
    <p
      id={id ?? field?.errorId}
      role="alert"
      aria-live="polite"
      className={cn("text-base text-sofi-red", className)}
      {...props}
    >
      {children}
    </p>
  );
}
