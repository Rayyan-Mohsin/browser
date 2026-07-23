'use strict';

const { ipcMain, dialog } = require('electron');

function registerExtensionHandlers(extensionManager, win) {
  ipcMain.handle('extensions:openLoadDialog', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('extensions:load', (_e, { path: extPath }) => extensionManager.loadExtension(extPath));
  ipcMain.handle('extensions:list', () => extensionManager.listExtensions());
  ipcMain.handle('extensions:remove', (_e, { id }) => extensionManager.removeExtension(id));
}

module.exports = { registerExtensionHandlers };
