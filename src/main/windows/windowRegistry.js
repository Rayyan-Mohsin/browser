'use strict';

// Every per-window IPC channel in this app is invoked from the chrome view's
// own renderer, so `event.sender.id` (the chrome WebContents' id) is the
// natural key for "which browser window did this call come from." IPC
// handlers are registered exactly once per channel for the whole app's
// lifetime (Electron forbids registering the same channel twice), so instead
// of closing each handler over one window's TabManager, handlers look up the
// right window's context here at call time.
const windows = new Map();

function registerWindow(chromeWebContentsId, context) {
  windows.set(chromeWebContentsId, context);
  return () => windows.delete(chromeWebContentsId);
}

function getContext(chromeWebContentsId) {
  return windows.get(chromeWebContentsId);
}

function allContexts() {
  return Array.from(windows.values());
}

module.exports = { registerWindow, getContext, allContexts };
