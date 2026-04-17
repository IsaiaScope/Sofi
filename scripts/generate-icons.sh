#!/usr/bin/env bash
set -euo pipefail

# Generate all Sofi application assets from source SVGs.
# Usage: ./scripts/generate-icons.sh [--all | --tauri | --web | --tray]
# Default: --all
#
# Sources (in src/assets/):
#   sofi-icon.svg           → All platform icons (macOS applies its own squircle mask)
#   sofi-tray-template.svg  → macOS tray template images
#   sofi-tray-light.svg     → Windows/Linux tray (dark bg)
#   sofi-tray-dark.svg      → Windows/Linux tray (light bg)
#   (public/favicon.svg)    → favicon.ico
#
# Dependencies: rsvg-convert (librsvg), magick (ImageMagick 7)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ICONS_DIR="$PROJECT_DIR/src-tauri/icons"
TRAY_DIR="$ICONS_DIR/tray"
PUBLIC_DIR="$PROJECT_DIR/public"
ASSETS_DIR="$PROJECT_DIR/src/assets"
TEMP_PNG="$PROJECT_DIR/.icon-tmp.png"

MODE="${1:---all}"

# ── Dependency checks ──────────────────────────────────────────────

check_rsvg() {
  if ! command -v rsvg-convert &>/dev/null; then
    echo "Error: rsvg-convert not found. Install: brew install librsvg"
    exit 1
  fi
}

check_magick() {
  if command -v magick &>/dev/null; then
    MAGICK_CMD="magick"
  elif command -v convert &>/dev/null; then
    MAGICK_CMD="convert"
  else
    echo "Error: ImageMagick not found. Install: brew install imagemagick"
    exit 1
  fi
}

# ── Tauri platform icons ──────────────────────────────────────────

generate_tauri() {
  local source="${ASSETS_DIR}/sofi-icon.svg"
  if [ ! -f "$source" ]; then
    echo "Error: Source not found: $source"
    return 1
  fi

  echo "── Tauri Platform Icons ──"
  echo "   Source: $source"

  # SVG → 1024x1024 PNG (single source for all platforms — macOS applies its own squircle mask)
  echo "   → Rendering 1024x1024 PNG..."
  rsvg-convert -w 1024 -h 1024 "$source" -o "$TEMP_PNG"

  # Clean macOS resource forks that break builds on external drives
  find "$PROJECT_DIR/src-tauri" -name '._*' -delete 2>/dev/null || true

  # Generate all Tauri platform icons
  echo "   → Running tauri icon..."
  cd "$PROJECT_DIR"
  pnpm tauri icon "$TEMP_PNG" 2>&1 || true

  rm -f "$TEMP_PNG"

  # Verify
  local count=0
  for f in "$ICONS_DIR"/32x32.png "$ICONS_DIR"/128x128.png "$ICONS_DIR"/icon.ico "$ICONS_DIR"/icon.icns "$ICONS_DIR"/icon.png; do
    [ -f "$f" ] && count=$((count + 1))
  done
  echo "   ✓ $count/5 core icons verified"
  echo ""
}

# ── Web assets ────────────────────────────────────────────────────

generate_web() {
  echo "── Web Assets ──"

  # apple-touch-icon.png (180x180 from sofi-icon.svg)
  local icon_source="${ASSETS_DIR}/sofi-icon.svg"
  if [ -f "$icon_source" ]; then
    echo "   → apple-touch-icon.png (180x180)..."
    rsvg-convert -w 180 -h 180 "$icon_source" -o "${PUBLIC_DIR}/apple-touch-icon.png"
    echo "   ✓ public/apple-touch-icon.png"
  else
    echo "   ✗ Skipped apple-touch-icon (source missing)"
  fi

  # favicon.ico (16+32 multi-resolution from favicon.svg)
  local fav_source="${PUBLIC_DIR}/favicon.svg"
  if [ -f "$fav_source" ]; then
    echo "   → favicon.ico (16x16 + 32x32)..."
    local tmp16="${PROJECT_DIR}/.fav-16.png"
    local tmp32="${PROJECT_DIR}/.fav-32.png"
    rsvg-convert -w 16 -h 16 "$fav_source" -o "$tmp16"
    rsvg-convert -w 32 -h 32 "$fav_source" -o "$tmp32"
    $MAGICK_CMD "$tmp16" "$tmp32" "${PUBLIC_DIR}/favicon.ico"
    rm -f "$tmp16" "$tmp32"
    echo "   ✓ public/favicon.ico"
  else
    echo "   ✗ Skipped favicon.ico (source missing)"
  fi

  echo ""
}

# ── Tray icons ────────────────────────────────────────────────────

generate_tray() {
  echo "── Tray Icons ──"
  mkdir -p "$TRAY_DIR"

  # macOS template images (monochrome black+alpha)
  local template_source="${ASSETS_DIR}/sofi-tray-template.svg"
  if [ -f "$template_source" ]; then
    echo "   → macOS template @1x (22x22)..."
    rsvg-convert -w 22 -h 22 "$template_source" -o "${TRAY_DIR}/icon-template.png"
    echo "   → macOS template @2x (44x44)..."
    rsvg-convert -w 44 -h 44 "$template_source" -o "${TRAY_DIR}/icon-template@2x.png"
    echo "   ✓ macOS template images"
  else
    echo "   ⊘ Skipped macOS template (${template_source} not found)"
  fi

  # Light tray icon (for dark tray backgrounds)
  local light_source="${ASSETS_DIR}/sofi-tray-light.svg"
  if [ -f "$light_source" ]; then
    echo "   → Light tray icon (32x32)..."
    rsvg-convert -w 32 -h 32 "$light_source" -o "${TRAY_DIR}/icon-light.png"
    echo "   ✓ icon-light.png"
  else
    echo "   ⊘ Skipped light tray icon (${light_source} not found)"
  fi

  # Dark tray icon (for light tray backgrounds)
  local dark_source="${ASSETS_DIR}/sofi-tray-dark.svg"
  if [ -f "$dark_source" ]; then
    echo "   → Dark tray icon (32x32)..."
    rsvg-convert -w 32 -h 32 "$dark_source" -o "${TRAY_DIR}/icon-dark.png"
    echo "   ✓ icon-dark.png"
  else
    echo "   ⊘ Skipped dark tray icon (${dark_source} not found)"
  fi

  echo ""
}

# ── Main ──────────────────────────────────────────────────────────

echo "=== Sofi Asset Generator ==="
echo ""

check_rsvg
check_magick

case "$MODE" in
  --tauri)
    generate_tauri
    ;;
  --web)
    generate_web
    ;;
  --tray)
    generate_tray
    ;;
  --all)
    generate_tauri
    generate_web
    generate_tray
    ;;
  *)
    echo "Usage: $0 [--all | --tauri | --web | --tray]"
    exit 1
    ;;
esac

echo "=== Done ==="
