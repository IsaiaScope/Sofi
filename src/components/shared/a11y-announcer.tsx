import { ANNOUNCER_ID } from "@/lib/hooks/use-announcer";

export function A11yAnnouncer() {
  return (
    <div
      id={ANNOUNCER_ID}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
