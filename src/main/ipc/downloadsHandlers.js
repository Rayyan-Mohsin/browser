'use strict';

const { ipcMain } = require('electron');

function registerDownloadsHandlers(downloadManager) {
  ipcMain.handle('downloads:list', () => downloadManager.list());
  ipcMain.handle('downloads:openFile', (_e, { id }) => downloadManager.openFile(id));
  ipcMain.handle('downloads:showInFolder', (_e, { id }) => downloadManager.showInFolder(id));
}

module.exports = { registerDownloadsHandlers };
