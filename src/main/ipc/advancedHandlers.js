'use strict';

const { ipcMain, app } = require('electron');

/** Handlers used only by the separate Advanced Settings window, not the in-app panel. */
function registerAdvancedHandlers(settingsStore, historyStore) {
  ipcMain.handle('history:removeEntry', (_e, { id }) => historyStore.removeEntry(id));

  ipcMain.handle('advanced:setHistoryRetention', (_e, { days }) => {
    settingsStore.set({ historyRetentionDays: days });
    historyStore.pruneOlderThan(days);
    return settingsStore.get();
  });

  ipcMain.handle('advanced:getVersionInfo', () => ({
    app: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }));

  ipcMain.handle('advanced:resetSettings', () => settingsStore.reset());
}

module.exports = { registerAdvancedHandlers };
