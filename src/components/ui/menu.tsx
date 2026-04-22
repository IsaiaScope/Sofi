import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactElement, ReactNode } from "react";
import { FOCUS_RING_INSET } from "@/lib/a11y";
import { cn } from "@/lib/cn";

interface MenuProps {
  trigger: ReactElement;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Menu({ trigger, children, align = "left", className }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          side="bottom"
          align={align === "right" ? "end" : "start"}
          sideOffset={6}
        >
          <BaseMenu.Popup
            className={cn(
              "z-40 min-w-[200px] rounded-lg border border-sofi-border bg-sofi-elevated shadow-xl",
              "max-h-[300px] overflow-y-auto",
              className,
            )}
          >
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

interface MenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

// Inset ring avoids clipping inside the popup's overflow boundary.
export function MenuItem({ children, onClick, active, className }: MenuItemProps) {
  return (
    <BaseMenu.Item
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-base transition-colors",
        active
          ? "bg-violet-muted text-white"
          : "text-sofi-text-muted data-[highlighted]:bg-white/5 data-[highlighted]:text-sofi-text",
        FOCUS_RING_INSET,
        className,
      )}
    >
      {children}
    </BaseMenu.Item>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-sofi-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 font-semibold text-base text-sofi-text-dim uppercase tracking-wider">
      {children}
    </div>
  );
}
