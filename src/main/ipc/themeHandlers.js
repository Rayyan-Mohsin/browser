'use strict';

const { ipcMain, nativeTheme } = require('electron');

function resolveEffective(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function registerThemeHandlers(settingsStore, chromeWebContents) {
  const broadcast = () => {
    const { theme } = settingsStore.get();
    chromeWebContents.send('theme:changed', {
      mode: theme.mode,
      effective: resolveEffective(theme.mode),
      custom: theme.custom,
    });
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
