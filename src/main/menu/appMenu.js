'use strict';

const { Menu, app } = require('electron');

/** Edit-role items are required for Cmd+C/V/X/A to work in any text input on macOS. */
function buildAppMenu(tabManager) {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
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
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => tabManager.createTab() },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (tabManager.activeId) tabManager.closeTab(tabManager.activeId);
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
            if (tabManager.activeId) tabManager.reload(tabManager.activeId);
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
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildAppMenu };
