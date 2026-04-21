import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { FOCUS_RING } from "@/lib/a11y";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Visible title shown in the header. Required for a11y unless `ariaLabel` is set. */
  title?: string;
  /** Accessible name used when there's no visible title (uncommon — prefer `title`). */
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, ariaLabel, children, className }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <BaseDialog.Popup
          aria-label={title ? undefined : ariaLabel}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-sofi-border bg-sofi-surface p-6 shadow-2xl",
            "max-h-[85vh] overflow-y-auto",
            FOCUS_RING,
            className,
          )}
        >
          {title && (
            <div className="mb-4 flex items-center justify-between">
              <BaseDialog.Title className="font-heading text-lg font-semibold text-white">
                {title}
              </BaseDialog.Title>
              <BaseDialog.Close
                aria-label="Close dialog"
                className={cn(
                  "rounded-md p-1 text-base text-sofi-text-dim transition-colors hover:text-sofi-text",
                  FOCUS_RING,
                )}
              >
                <span aria-hidden="true">✕</span>
              </BaseDialog.Close>
            </div>
          )}
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
