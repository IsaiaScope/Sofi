# Sofi Brand Design Spec

## Context

Sofi is a Tauri 2.0 desktop app (Agent Command Center) with a cyberpunk, neon-on-dark aesthetic. This spec defines the complete brand identity — logo, icons, colors, typography, and the asset generation pipeline.

## Brand Personality

**Cyberpunk & Edgy** — Neon-on-dark, hacker aesthetic. Think Warp terminal, sci-fi command centers.

---

## Logo

### Icon (Primary App Icon)

- **File**: `src/assets/sofi-icon.svg`
- **Format**: 512x512 SVG, hand-crafted paths
- **Layout**: 2x2 grid — **S O** on top, **F I** below. Letters touch/merge between rows.
- **Letters**:
  - S: stroke-based (stroke-width 38/42, stroke-linecap round)
  - O: solid filled ellipse with flame motif inside
  - F: filled path with rounded capsule terminals
  - I: triangular body + paw-print dot (3 circles + ellipse)
- **Color**: Violet gradient `#7c3aed` → `#8b5cf6` → `#7c3aed` (`gradientUnits="userSpaceOnUse"`, repeating pattern spanning both rows)
- **Flame**: Dark gradient inside O (`#3a3a52` → `#121220`)
- **Background**: `#13101f` solid square (no rounded corners)
- **Effects**: Neon glow (feDropShadow stdDeviation 1.5, violet 0.25 opacity) + text shadow (dy:1 stdDeviation 1.5, black 0.2)
- **Two-pass rendering**: Pass 1 draws dark purple `#4c1d95` outlines (wider strokes), Pass 2 draws gradient fills (narrower strokes) on top — creates merged letter borders
- **Transform**: `translate(256, 256) scale(0.9) translate(-186.75, -242.75)` centers content

### Icon Variants

| File | Description |
|------|-------------|
| `sofi-icon.svg` | Primary: square dark bg, for all platform icon generation |
| `sofi-icon-macos.svg` | macOS Dock preview: rx=108 rounded corners + purple gradient border (3px, 0.5 opacity) |
| `sofi-icon-transparent.svg` | No background: for in-app use on dark surfaces |
| `sofi-icon-transparent-tight.svg` | Tight-cropped transparent: for constrained spaces |

### Wordmark

- **File**: `src/assets/sofi-wordmark.svg`
- **Format**: Hand-crafted SVG paths, viewBox `28.25 0.25 540 282`
- **Layout**: Horizontal **S O F I** in a row, all same height, touching
- **Letter positions**: S at x=93, O at x=186, F at x=300, I at x=449
- **Color**: Single smooth gradient `#7c3aed` → `#8b5cf6` → `#7c3aed` (userSpaceOnUse, y=42 to y=242)
- **Flame**: Same dark gradient inside O at translate(241, 141) scale(5.5)
- **Effects**: Same neon glow + text shadow as icon
- **Background**: None (transparent, for use on dark backgrounds)

| File | Description |
|------|-------------|
| `sofi-wordmark.svg` | Full wordmark with equal padding |
| `sofi-wordmark-tight.svg` | Tight-cropped (viewBox `58 22 481 239`) for constrained spaces |

### Favicon

- **File**: `public/favicon.svg`
- **Format**: 512x512 SVG with embedded CSS for dark/light mode
- **Design**: Simplified bold S stroke (same path as wordmark S, scaled up for clarity at 32px)
- **Dark mode** (default): Dark bg `#13101f` + violet S `#8b5cf6`
- **Light mode**: Violet bg `#7c3aed` + white S
- **Rationale**: The 2x2 SOFI grid is illegible at 16-32px; a bold S is recognizable at all sizes
- **Fallbacks**: `favicon.ico` (16+32px ICO) and `apple-touch-icon.png` (180x180 PNG)

### System Tray Icons (Future)

For when Sofi adds background agent monitoring via system tray:

| File | Description | Platform |
|------|-------------|----------|
| `sofi-tray-template.svg` | Pure black + alpha S stroke | macOS (template image, auto-inverts) |
| `sofi-tray-light.svg` | White/light S on transparent | Windows/Linux dark tray |
| `sofi-tray-dark.svg` | Dark violet S on transparent | Windows/Linux light tray |

macOS: Set `iconAsTemplate: true` in Tauri — OS auto-inverts for menu bar appearance.
Windows/Linux: Detect system theme at runtime, swap between light/dark variants.

---

## Color Palette

### Primary

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-violet-primary` | `#7c3aed` | Primary buttons, logo, active states |
| `--color-violet-hover` | `#8b5cf6` | Hover states, lighter accents, gradient highlights |
| `--color-violet-muted` | `rgba(124, 58, 237, 0.15)` | Subtle backgrounds, badges |

### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-cyan-accent` | `#06b6d4` | Links, focus rings, secondary buttons, terminal accents |
| `--color-cyan-hover` | `#22d3ee` | Hover states for cyan elements |
| `--color-cyan-muted` | `rgba(6, 182, 212, 0.15)` | Subtle cyan backgrounds |

### Backgrounds

| Token | Hex |
|-------|-----|
| `--color-sofi-bg` | `#0f0f1a` |
| `--color-sofi-surface` | `#12121e` |
| `--color-sofi-elevated` | `#1e1e30` |
| `--color-sofi-terminal` | `#0a0a14` |

### Semantic

| Token | Hex | Role |
|-------|-----|------|
| `--color-sofi-green` | `#10b981` | Success |
| `--color-sofi-orange` | `#f97316` | Warning |
| `--color-sofi-red` | `#ef4444` | Error |
| `--color-sofi-blue` | `#06b6d4` | Info (cyan) |

### Icon-Specific Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Dark purple outline | `#4c1d95` | Pass 1 letter outlines |
| Icon background | `#13101f` | Icon square bg |
| Flame dark | `#3a3a52` → `#121220` | Flame gradient inside O |
| macOS border | `#8b5cf6` → `#5b21b6` → `#8b5cf6` | macOS variant border gradient |

---

## Typography

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-heading` | Geist, Inter, system-ui | Headings, app title |
| `--font-sans` | Inter, system-ui | Body text |
| `--font-label` | Space Grotesk, Inter, system-ui | Labels, uppercase tracking |
| `--font-mono` | JetBrains Mono, Fira Code, monospace | Terminal, code |

### Font Loading

Google Fonts loaded in `index.html`:
- Inter (400, 500, 600, 700)
- JetBrains Mono (400, 500, 600)
- Space Grotesk (400, 500, 600, 700)
- Material Symbols Outlined (for UI icons)

---

## Asset Generation Pipeline

### Command
```bash
pnpm icons              # Generates all assets (same as --all)
pnpm icons --tauri      # Tauri platform icons only
pnpm icons --web        # Web assets only (favicon.ico, apple-touch-icon)
pnpm icons --tray       # Tray icons only (when sources exist)
```

### Dependencies
- `rsvg-convert` — SVG → PNG rasterization (`brew install librsvg`)
- `magick` — PNG → ICO conversion (`brew install imagemagick`)
- `pnpm tauri icon` — generates all Tauri platform-specific formats

### Pipeline
1. `sofi-icon.svg` → 1024x1024 PNG → `pnpm tauri icon` → all platform icons in `src-tauri/icons/`
2. `sofi-icon.svg` → 180x180 PNG → `public/apple-touch-icon.png`
3. `favicon.svg` → 16+32px PNGs → `public/favicon.ico`
4. Tray SVGs → 22/44/32px PNGs → `src-tauri/icons/tray/` (when sources exist)

### Generated Files

**Tauri Desktop** (`src-tauri/icons/`):
- `32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png`
- `icon.icns` (macOS), `icon.ico` (Windows)
- `Square*.png` (Windows Store), `StoreLogo.png`

**iOS** (`src-tauri/icons/ios/`): AppIcon at all required sizes
**Android** (`src-tauri/icons/android/`): mipmap directories at all densities

**Web** (`public/`):
- `favicon.svg` (dark/light mode aware)
- `favicon.ico` (16+32px, legacy fallback)
- `apple-touch-icon.png` (180x180)

**Tray** (`src-tauri/icons/tray/`, future):
- `icon-template.png` (22x22), `icon-template@2x.png` (44x44) — macOS
- `icon-light.png`, `icon-dark.png` (32x32) — Windows/Linux

---

## Platform Considerations

### macOS
- macOS auto-applies squircle mask to app icons — safe zone is inner 80%
- macOS 26+ does NOT auto-adapt icons for dark mode — Sofi's dark bg works in both modes
- Menu bar/tray: use template images (`iconAsTemplate: true`) for auto light/dark switching

### Windows
- `.ico` with 16, 24, 32, 48, 64, 256px layers (auto-generated)
- System tray: no automatic theme switching — need dual icons or neutral color
- Store logos: `Square30x30` through `Square310x310` (auto-generated)

### Linux
- PNG icons at freedesktop standard sizes (auto-generated)
- System tray: same contrast issues as Windows

### Web (Tauri WebView)
- SVG favicon with `@media (prefers-color-scheme)` CSS for dark/light adaptation
- `.ico` fallback for Safari and legacy contexts
- Dual `<meta name="theme-color">` tags for browser chrome theming

---

## Files Inventory

### Source SVGs (`src/assets/`)
| File | Purpose |
|------|---------|
| `sofi-icon.svg` | Primary icon source (all platform icons generated from this) |
| `sofi-icon-macos.svg` | macOS Dock preview variant |
| `sofi-icon-transparent.svg` | In-app use on dark backgrounds |
| `sofi-icon-transparent-tight.svg` | Tight-cropped for constrained spaces |
| `sofi-wordmark.svg` | Horizontal wordmark (top-bar, auth pages) |
| `sofi-wordmark-tight.svg` | Tight-cropped wordmark |

### Frontend Usage
| Component | Asset |
|-----------|-------|
| `top-bar.tsx` | `sofi-wordmark.svg` |
| `login-page.tsx` | `sofi-wordmark.svg` |
| `register-page.tsx` | `sofi-wordmark.svg` |
| `index.html` | `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` |

### Tauri Config (`tauri.conf.json`)
```json
"bundle": {
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ]
}
```
