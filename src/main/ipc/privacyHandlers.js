'use strict';

const { ipcMain } = require('electron');

function registerPrivacyHandlers(session, historyStore) {
  ipcMain.handle('privacy:clearData', async (_e, { history, cache, cookies } = {}) => {
    if (history) historyStore.clear();
    if (cache) await session.clearCache();
    if (cookies) {
      await session.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers'] });
    }
  });
}

module.exports = { registerPrivacyHandlers };
