import { createFileRoute } from "@tanstack/react-router";
import { FaultPage } from "@/components/fault-page";

// Dev-only visual preview for the fault chassis. Renders FaultPage directly
// (no thrown error) so you can review amber chrome, glyph, copy, and TRACE
// expander without actually crashing the app.
// Navigate to /__fault-preview?scope=boundary or ?scope=route.
export const Route = createFileRoute("/_public/fault-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    scope: (search.scope === "route" ? "route" : "boundary") as "boundary" | "route",
  }),
  component: FaultPreview,
});

function FaultPreview() {
  const { scope } = Route.useSearch();
  const fakeError = new Error(
    scope === "route"
      ? "Cannot read properties of undefined (reading 'map')"
      : "ReferenceError: greetingFormatter is not defined",
  );
  fakeError.stack = [
    fakeError.message,
    "    at WelcomePage (src/routes/_authenticated/index.tsx:12:5)",
    "    at renderWithHooks (react-dom/cjs/react-dom.development.js:16305:18)",
    "    at updateFunctionComponent (react-dom/cjs/react-dom.development.js:19588:20)",
  ].join("\n");
  return (
    <FaultPage
      scope={scope}
      statusKey={scope === "route" ? "hud.faultRoute" : "hud.faultRuntime"}
      error={fakeError}
    />
  );
}
