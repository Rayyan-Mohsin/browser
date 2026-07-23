'use strict';

const { ipcMain, dialog } = require('electron');
const { getContext } = require('../windows/windowRegistry');

function registerExtensionHandlers(extensionManager) {
  ipcMain.handle('extensions:openLoadDialog', async (e) => {
    const ctx = getContext(e.sender.id);
    const result = await dialog.showOpenDialog(ctx ? ctx.win : undefined, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('extensions:load', (_e, { path: extPath }) => extensionManager.loadExtension(extPath));
  ipcMain.handle('extensions:list', () => extensionManager.listExtensions());
  ipcMain.handle('extensions:remove', (_e, { id }) => extensionManager.removeExtension(id));
}

module.exports = { registerExtensionHandlers };
