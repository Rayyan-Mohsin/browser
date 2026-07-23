'use strict';

const { ipcMain } = require('electron');

function registerHistoryHandlers(historyStore) {
  ipcMain.handle('history:list', () => historyStore.list());
  ipcMain.handle('history:clear', () => historyStore.clear());
}

module.exports = { registerHistoryHandlers };
