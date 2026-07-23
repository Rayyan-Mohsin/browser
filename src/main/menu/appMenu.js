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
        // Built-in roles: Electron/Chromium handle the Cmd/Ctrl+=/-/0
        // accelerators (including the shifted "+" key) and target
        // whichever WebContents currently has focus, which correctly
        // reaches the active tab's page.
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
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
