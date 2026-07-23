'use strict';

const { ipcMain } = require('electron');
const { getContext } = require('../windows/windowRegistry');

function registerUiHandlers() {
  ipcMain.handle('ui:setHeaderHeight', (e, { height }) => getContext(e.sender.id)?.tabManager.setHeaderHeight(height));
  ipcMain.handle('ui:setOverlayOpen', (e, { open }) => getContext(e.sender.id)?.tabManager.setOverlayOpen(open));
}

module.exports = { registerUiHandlers };
