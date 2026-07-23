'use strict';

const { ipcMain } = require('electron');

function registerTabHandlers(tabManager) {
  ipcMain.handle('tabs:create', (_e, { url, private: explicitPrivate } = {}) => {
    // Explicit request (the "New Private Tab" menu item) always wins;
    // otherwise a plain new tab inherits the active tab's private state,
    // so opening tabs from a private one keeps you in private mode.
    const isPrivate = explicitPrivate !== undefined ? explicitPrivate : tabManager.isActiveTabPrivate();
    return tabManager.createTab(url, { private: isPrivate });
  });
  ipcMain.handle('tabs:close', (_e, { id }) => tabManager.closeTab(id));
  ipcMain.handle('tabs:switch', (_e, { id }) => tabManager.switchTab(id));
  ipcMain.handle('tabs:list', () => tabManager.list());
  ipcMain.handle('tabs:navigate', (_e, { id, input }) => tabManager.navigate(id, input));
  ipcMain.handle('tabs:reload', (_e, { id }) => tabManager.reload(id));
  ipcMain.handle('tabs:stop', (_e, { id }) => tabManager.stop(id));
  ipcMain.handle('tabs:goBack', (_e, { id }) => tabManager.goBack(id));
  ipcMain.handle('tabs:goForward', (_e, { id }) => tabManager.goForward(id));
}

module.exports = { registerTabHandlers };
