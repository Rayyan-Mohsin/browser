'use strict';

const { ipcMain } = require('electron');

function registerSettingsHandlers(settingsStore) {
  ipcMain.handle('settings:get', () => settingsStore.get());
  ipcMain.handle('settings:set', (_e, patch) => settingsStore.set(patch));
}

module.exports = { registerSettingsHandlers };
