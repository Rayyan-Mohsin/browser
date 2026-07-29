# Ruh

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

Opens the browser window with devtools-friendly flags. On macOS the app
stays running with no windows open (standard convention); clicking the dock
icon again (or File → New Window) opens a new one.

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
(generating `.icns` requires macOS-only tools). Drop the Ruh logo in at
`assets/icon.png` (1024x1024) and see `assets/ICON_INSTRUCTIONS.md` for the
one-time `sips`/`iconutil` steps to turn it into `assets/icon.icns`.

## Features

- **Tabs**: each tab is its own Chromium `WebContentsView`; only the active
  tab is attached below the always-visible header, so switching tabs
  preserves each page's live state. The header's real height is measured
  live by the renderer and reported to the main process (not hardcoded),
  so button sizing, tab bar layout, and the bookmarks bar can all change
  without ever letting page content overlap the header. Cycle tabs with
  ⌃⇥ / ⌃⇧⇥ (Control+Tab / Control+Shift+Tab); switching to a blank/new-tab
  page — however you get there — always focuses the address bar so you can
  start typing immediately.
- **Page context menu**: right-click a link, image, selection, or editable
  field on any page for the usual actions (open link in a new/private tab,
  copy link/image address, save image, cut/copy/paste, back/forward/reload,
  inspect element).
- **Zoom**: ⌘+/⌘-/⌘0 always zoom the active page, never the browser's own
  tab bar/address bar — those stay a fixed size no matter what.
- **Tab bar layout**: Settings → Tab Bar lets you pick **Separate** (default:
  tabs and the address bar in two rows) or **Compact** (Safari-style: they
  merge into one row and the active tab becomes the editable address field).
  In both layouts, tabs stay full size until there are too many to fit, then
  shrink to make room (rather than forcing horizontal scrolling); the "+"
  new-tab button sits in a fixed spot next to the (separately scrollable)
  tab strip, so it never moves as tabs are added or shrink.
- **Tab groups**: right-click any tab → "New Group from Tab" / "Add to
  Group" / "Rename Group…" / "Remove from Group". Colors are assigned
  automatically from a small fixed palette; grouped tabs get a thin colored
  line. Deliberately the *only* persistent UI for this — no toolbar button or
  panel, so it's there if you want it and invisible otherwise. Every group
  also gets a small colored chip in the tab strip; click it to collapse the
  group's tabs down to just that chip, or click again to expand them back
  out (right-click the chip to rename/ungroup/toggle while collapsed).
- **Drag-and-drop tabs**: click and drag any tab pill to reorder the tab
  strip, or drop a tab onto another tab (or a group's chip) to join that
  group; dragging a tab out of its group to an ungrouped spot removes it
  from the group.
- **Multiple windows**: File → New Window (⌘N) opens a fully independent
  browser window with its own tabs; Advanced Settings and the app's shared
  bookmarks/history/downloads/settings stay in sync across all of them.
- **Bookmarks**: add/remove via the star icon, browse via the bookmarks bar
  (toggle in Settings), stored in
  `~/Library/Application Support/Ruh/bookmarks.json`.
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
- **Private tabs**: File → New Private Tab (⌘⇧N) opens a tab on its own
  in-memory Electron session partition — no cookies, cache, or history are
  ever written to disk for it, and it's gone once closed. Plain new tabs
  opened from a private one inherit private mode, matching how other
  browsers' incognito windows behave. Indicated by a small badge/tint in the
  address bar and tab strip (deliberately not labeled "incognito").
- **Video fullscreen**: pressing a video player's own fullscreen button
  (HTML5 Fullscreen API — distinct from the app's own window-fullscreen
  toggle) hides the tab bar/address bar entirely and enters real macOS
  fullscreen, Safari-style. `View → Toggle Full Screen` (window fullscreen)
  is unaffected and still shows the normal chrome.
- **Advanced Settings**: a separate native window (app menu → Advanced
  Settings…, ⌘,) — deliberately *not* part of the in-app Settings popover —
  with a searchable full history list with per-entry delete, an automatic
  history-retention policy (applied on launch and instantly on change),
  "clear all data on quit", app/Electron/Chromium version info, and a
  reset-to-defaults action.

## Project layout

```
src/
  shared/layout.js        Layout constants + search engine presets, shared by main + renderer
  main/                   Electron main process (window, tabs, IPC, stores, menu, downloads)
  preload/                contextBridge-based IPC allowlists (one for the main window, a
                           narrower one for the separate Advanced Settings window)
  renderer/chrome/        The browser's own UI (tab bar/address bar/toolbar/settings/tooltips)
  renderer/newtab/        Default page for a fresh tab (search box)
  renderer/preferences/   The separate native Advanced Settings window's page
test/                     node:test unit tests for store/history/downloads/URL logic
```

## Known limitations / good next steps

- No auto-update mechanism (kept out deliberately to avoid background
  telemetry/bloat); add `electron-updater` later if you want it.
- Extensions: see the two limitations above (also not loaded into private
  tabs' session partition, matching how other browsers treat incognito).
- Downloads are tracked per-session in `downloads.json` but there's no
  pause/resume/cancel UI yet — only Open and Show-in-Finder.
- Tab creation/removal doesn't animate beyond the new tab's own entrance
  (by design, per user request) — the tab strip fully re-renders each
  update, so a persistent-DOM-diffing rewrite would be needed to animate
  e.g. a tab smoothly resizing when switching in Compact layout.
