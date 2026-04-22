import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 10,
  className,
}: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={sideOffset}>
          <BaseTooltip.Popup
            className={cn(
              "rounded-md border border-sofi-border bg-sofi-elevated px-3 py-1.5 text-base text-sofi-text shadow-lg",
              "transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
              className,
            )}
          >
            <BaseTooltip.Arrow className="fill-sofi-elevated stroke-sofi-border" />
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export const TooltipProvider = BaseTooltip.Provider;
