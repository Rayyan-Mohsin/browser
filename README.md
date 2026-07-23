# Browser

A lightweight, modern, Chromium-based web browser for Apple Silicon (ARM64)
Macs, built on Electron. Minimalist macOS-native UI (vibrancy, hidden title
bar, custom tab/address bar), light/dark/system theming with custom theme
support, bookmarks, and unpacked Chrome/WebExtensions support. Packaged as an
installable `.dmg`.

## Why Electron

Chromium-based + Chrome extension support ruled out Tauri: on macOS, Tauri
renders through Apple's native WKWebView, not Chromium, so it has no
`chrome.*` extension APIs at all. Electron bundles real Chromium and exposes
`session.loadExtension()` for unpacked MV3 extensions. "Lightweight" is
achieved by keeping the app's own code dependency-free — vanilla HTML/CSS/JS
in the renderer, no React/webpack, no `electron-store` — rather than by
swapping runtimes; Electron's bundled Chromium is a fixed cost either way.

## Requirements

- Node.js 18+
- macOS on Apple Silicon, for actually running/building the app (this
  project can be edited/tested on any OS, but Electron's GUI needs macOS and
  the `.dmg` packaging step needs macOS-only tools).

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens the browser window with devtools-friendly flags. Closing all windows
quits the app (standard non-macOS behavior is used here for simplicity; feel
free to add the usual `activate`/dock-icon reopen handler later if you want
strict adherence to macOS conventions where the app stays running with no
windows open).

## Testing

```bash
npm test
```

Runs `node --test` over `test/`, covering the JSON store (atomic writes,
corrupt-file fallback), bookmark CRUD, and URL-vs-search-query normalization.
These are plain Node tests with zero Electron/display dependency.

## Building the .dmg

```bash
./build.sh
```

or equivalently `npm run build`. This **must run on macOS** — electron-builder's
dmg target shells out to `hdiutil`/`codesign`, neither of which exists on
Linux/Windows. Output lands in `dist/*.dmg`.

The build produces an **unsigned/ad-hoc** app (no paid Apple Developer ID is
assumed). On first launch, macOS Gatekeeper will refuse to open it normally —
right-click the app → **Open** → **Open** once to allow it permanently.

### Optional: real code signing + notarization

If you later get a paid Apple Developer ID:

1. Remove `CSC_IDENTITY_AUTO_DISCOVERY=false` from `build.sh` (or set your
   identity explicitly via `CSC_NAME`) so electron-builder signs with your
   certificate.
2. After building, notarize and staple:

   ```bash
   xcrun notarytool submit dist/*.dmg --apple-id you@example.com \
     --team-id YOURTEAMID --password @keychain:AC_PASSWORD --wait
   xcrun stapler staple dist/*.dmg
   ```

### App icon

`electron-builder.yml` points at `assets/icon.icns`, which isn't included
(generating `.icns` requires macOS-only tools). See
`assets/ICON_INSTRUCTIONS.md` for the one-time `sips`/`iconutil` steps to
generate it from a 1024x1024 PNG.

## Features

- **Tabs**: each tab is its own Chromium `WebContentsView`; only the active
  tab is attached below the always-visible header, so switching tabs
  preserves each page's live state. The header's real height is measured
  live by the renderer and reported to the main process (not hardcoded),
  so button sizing, tab bar layout, and the bookmarks bar can all change
  without ever letting page content overlap the header.
- **Tab bar layout**: Settings → Tab Bar lets you pick **Separate** (default:
  tabs and the address bar in two rows) or **Compact** (Safari-style: they
  merge into one row and the active tab becomes the editable address field).
- **Bookmarks**: add/remove via the star icon, browse via the bookmarks bar
  (toggle in Settings), stored in
  `~/Library/Application Support/Browser/bookmarks.json`.
- **History**: every visited page is recorded (Settings → History); click an
  entry to revisit it, or clear it entirely. Stored in `history.json`
  alongside bookmarks/settings.
- **Downloads**: files save automatically to `~/Downloads` (auto-renamed on
  collision, no per-file dialog); Settings → Downloads lists recent
  downloads with Open/Show-in-Finder actions.
- **Share**: the share icon next to the address bar (or inside the active
  tab in Compact layout) opens the real macOS share sheet via Electron's
  native `ShareMenu`.
- **Search engine**: Settings → Search Engine offers Google/Bing/DuckDuckGo
  presets or a custom `%s`-template URL. The new-tab page's search box
  respects this choice too.
- **Privacy**: Settings → Privacy can clear browsing history, cache, and/or
  cookies & site data independently.
- **Themes**: Light / Dark / System (tracks macOS appearance live) from the
  gear-icon Settings panel. Custom themes are just CSS custom property
  overrides (`--accent`, `--bg-chrome`, etc.) — see
  `src/renderer/chrome/theme.css`.
- **Tooltips**: hovering any Settings control shows a short description of
  what it does (`src/renderer/chrome/components/tooltip.js`).
- **Extensions**: Settings → "Load Unpacked Extension…" picks a folder
  containing a `manifest.json`. Two real platform limitations, not bugs:
  - No one-click Chrome Web Store install is possible in *any* Electron app —
    that flow is proprietary to Google Chrome's own installer.
  - Electron runs extension background/content scripts and permissions in
    full, but doesn't render a Chrome-style toolbar action button/popup out
    of the box. v1 ships a simple enable/disable/remove list in Settings
    instead; full toolbar UI is a future option via the community package
    `electron-chrome-extensions`.

## Project layout

```
src/
  shared/layout.js        Layout constants + search engine presets, shared by main + renderer
  main/                   Electron main process (window, tabs, IPC, stores, menu, downloads)
  preload/                contextBridge-based IPC allowlist
  renderer/chrome/        The browser's own UI (tab bar/address bar/toolbar/settings/tooltips)
  renderer/newtab/        Default page for a fresh tab (search box)
test/                     node:test unit tests for store/history/downloads/URL logic
```

## Known limitations / good next steps

- No auto-update mechanism (kept out deliberately to avoid background
  telemetry/bloat); add `electron-updater` later if you want it.
- Extensions: see the two limitations above.
- Downloads are tracked per-session in `downloads.json` but there's no
  pause/resume/cancel UI yet — only Open and Show-in-Finder.
