'use strict';

const { ipcMain } = require('electron');

function registerUiHandlers(tabManager) {
  ipcMain.handle('ui:setHeaderHeight', (_e, { height }) => tabManager.setHeaderHeight(height));
  ipcMain.handle('ui:setOverlayOpen', (_e, { open }) => tabManager.setOverlayOpen(open));
}

module.exports = { registerUiHandlers };
