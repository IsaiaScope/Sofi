import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/hooks/use-click-outside";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, children, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(
    ref,
    useCallback(() => setOpen(false), []),
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="appearance-none bg-transparent border-0 p-0 m-0 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full z-40 mt-1.5 min-w-[200px] rounded-lg border border-sofi-border bg-sofi-elevated shadow-xl",
            "max-h-[300px] overflow-y-auto",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
          role="menu"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, active, className }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
        active
          ? "bg-violet-muted text-white"
          : "text-sofi-text-muted hover:bg-white/5 hover:text-sofi-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-sofi-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 font-label text-[9px] font-semibold uppercase tracking-wider text-sofi-text-dim">
      {children}
    </div>
  );
}
