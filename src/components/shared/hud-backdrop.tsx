// Shared HUD chrome: cyan 32px grid + 4px horizontal scanlines. Used by AuthShell
// and LoadingSplash so the splash-to-auth transition has no visual step. Token
// values are also hand-mirrored in backend/apps/users/templates/users/email_verified.html
// (Django template can't import the SPA stylesheet) — retune all three together.
//
// Renders two absolutely-positioned sibling layers. The consumer's parent must be
// `relative` with `overflow-hidden`, and any content that should sit on top
// needs z-index ≥ 20 to clear the scanline layer at z-10.

const GRID_BG = `
  linear-gradient(to right, var(--sofi-hud-grid) 1px, transparent 1px),
  linear-gradient(to bottom, var(--sofi-hud-grid) 1px, transparent 1px)
`;

const SCANLINE_BG = "linear-gradient(to bottom, transparent 50%, var(--sofi-hud-scanline) 50%)";

export function HudBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundImage: GRID_BG, backgroundSize: "32px 32px" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-30"
        style={{ backgroundImage: SCANLINE_BG, backgroundSize: "100% 4px" }}
      />
    </>
  );
}
