'use strict';

const { ipcMain } = require('electron');
const { getContext } = require('../windows/windowRegistry');

function registerTabHandlers() {
  ipcMain.handle('tabs:create', (e, { url, private: explicitPrivate } = {}) => {
    const { tabManager } = getContext(e.sender.id) || {};
    if (!tabManager) return;
    // Explicit request (the "New Private Tab" menu item) always wins;
    // otherwise a plain new tab inherits the active tab's private state,
    // so opening tabs from a private one keeps you in private mode.
    const isPrivate = explicitPrivate !== undefined ? explicitPrivate : tabManager.isActiveTabPrivate();
    return tabManager.createTab(url, { private: isPrivate });
  });
  ipcMain.handle('tabs:close', (e, { id }) => getContext(e.sender.id)?.tabManager.closeTab(id));
  ipcMain.handle('tabs:switch', (e, { id }) => getContext(e.sender.id)?.tabManager.switchTab(id));
  ipcMain.handle('tabs:list', (e) => getContext(e.sender.id)?.tabManager.list() || []);
  ipcMain.handle('tabs:navigate', (e, { id, input }) => getContext(e.sender.id)?.tabManager.navigate(id, input));
  ipcMain.handle('tabs:reload', (e, { id }) => getContext(e.sender.id)?.tabManager.reload(id));
  ipcMain.handle('tabs:stop', (e, { id }) => getContext(e.sender.id)?.tabManager.stop(id));
  ipcMain.handle('tabs:goBack', (e, { id }) => getContext(e.sender.id)?.tabManager.goBack(id));
  ipcMain.handle('tabs:goForward', (e, { id }) => getContext(e.sender.id)?.tabManager.goForward(id));
  ipcMain.handle('tabs:moveTab', (e, { id, beforeId }) => getContext(e.sender.id)?.tabManager.moveTab(id, beforeId || null));
}

module.exports = { registerTabHandlers };
