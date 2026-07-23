'use strict';

const { ipcMain, nativeTheme } = require('electron');
const { allContexts } = require('../windows/windowRegistry');

function resolveEffective(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function registerThemeHandlers(settingsStore) {
  const broadcast = () => {
    const { theme } = settingsStore.get();
    const payload = {
      mode: theme.mode,
      effective: resolveEffective(theme.mode),
      custom: theme.custom,
    };
    for (const { chromeView } of allContexts()) {
      chromeView.webContents.send('theme:changed', payload);
    }
  };

  ipcMain.handle('theme:get', () => {
    const { theme } = settingsStore.get();
    return { mode: theme.mode, effective: resolveEffective(theme.mode), custom: theme.custom };
  });

  ipcMain.handle('theme:set', (_e, patch) => {
    const theme = settingsStore.setTheme(patch);
    nativeTheme.themeSource = theme.mode;
    broadcast();
  });

  nativeTheme.on('updated', () => {
    const { theme } = settingsStore.get();
    if (theme.mode === 'system') broadcast();
  });

  return { broadcast };
}

module.exports = { registerThemeHandlers };
