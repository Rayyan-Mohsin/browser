'use strict';

const { Menu, app, BrowserWindow } = require('electron');
const { allContexts } = require('../windows/windowRegistry');

/** Finds the TabManager belonging to whichever window currently has OS focus. */
function focusedTabManager() {
  const focused = BrowserWindow.getFocusedWindow();
  if (!focused) return null;
  const ctx = allContexts().find((c) => c.win.id === focused.id);
  return ctx ? ctx.tabManager : null;
}

/** Edit-role items are required for Cmd+C/V/X/A to work in any text input on macOS. */
function buildAppMenu({ openPreferences, createNewWindow } = {}) {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        // A separate native window, deliberately not part of the in-app
        // Settings popover -- see src/main/windows/preferencesWindow.js.
        {
          label: 'Advanced Settings…',
          accelerator: 'CmdOrCtrl+,',
          click: () => openPreferences && openPreferences(),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createNewWindow && createNewWindow(),
        },
        { type: 'separator' },
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          // Opening a plain new tab from a private one stays private,
          // matching how private/incognito windows behave in other browsers.
          click: () => {
            const tabManager = focusedTabManager();
            if (tabManager) tabManager.createTab(undefined, { private: tabManager.isActiveTabPrivate() });
          },
        },
        {
          label: 'New Private Tab',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => focusedTabManager()?.createTab(undefined, { private: true }),
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const tabManager = focusedTabManager();
            if (tabManager && tabManager.activeId) tabManager.closeTab(tabManager.activeId);
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const tabManager = focusedTabManager();
            if (tabManager && tabManager.activeId) tabManager.reload(tabManager.activeId);
          },
        },
        { type: 'separator' },
        // Literal "Control", not "CmdOrCtrl": Cmd+Tab is reserved by macOS
        // for switching apps, so tab-cycling has to stay on the physical
        // Ctrl key even on Mac.
        {
          label: 'Select Next Tab',
          accelerator: 'Control+Tab',
          click: () => focusedTabManager()?.selectNextTab(),
        },
        {
          label: 'Select Previous Tab',
          accelerator: 'Control+Shift+Tab',
          click: () => focusedTabManager()?.selectPreviousTab(),
        },
        { type: 'separator' },
        // Deliberately NOT the built-in resetZoom/zoomIn/zoomOut roles:
        // those target whichever WebContents currently has OS focus, which
        // can be chromeView itself (the tab bar/address bar UI) -- e.g.
        // right after clicking into the address bar -- so Cmd/Ctrl+=/-/0
        // would zoom the browser's own chrome instead of the page. These
        // explicit handlers always act on the active tab's page instead.
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => focusedTabManager()?.resetZoom(),
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => focusedTabManager()?.zoomIn(),
        },
        // Hidden duplicate: on most keyboards the unshifted zoom-in key is
        // "=", and Chromium/Electron's own zoomIn role listens for both
        // "Plus" and "=" -- a single MenuItem can only carry one
        // accelerator, so this covers the second one invisibly.
        {
          label: 'Zoom In (=)',
          accelerator: 'CmdOrCtrl+=',
          visible: false,
          click: () => focusedTabManager()?.zoomIn(),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => focusedTabManager()?.zoomOut(),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildAppMenu };
