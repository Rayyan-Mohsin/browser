'use strict';

const path = require('path');
const { BrowserWindow, nativeTheme } = require('electron');

// Singleton: re-focuses the existing window rather than opening duplicates.
let preferencesWindow = null;

/**
 * A separate, standard-chrome native window for advanced/power-user settings
 * (detailed history, retention policy, reset, about) -- deliberately not
 * part of the in-app Settings popover. Opened from the app menu only.
 */
function createOrShowPreferencesWindow() {
  if (preferencesWindow && !preferencesWindow.isDestroyed()) {
    preferencesWindow.show();
    preferencesWindow.focus();
    return preferencesWindow;
  }

  preferencesWindow = new BrowserWindow({
    width: 640,
    height: 580,
    minWidth: 520,
    minHeight: 420,
    title: 'Advanced Settings',
    fullscreenable: false,
    show: false,
    // Matches the page's own --bg so there's no flash of the wrong color
    // before it loads and paints.
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c1e' : '#f2f2f5',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preferences-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  preferencesWindow.once('ready-to-show', () => preferencesWindow.show());
  preferencesWindow.loadFile(path.join(__dirname, '../../renderer/preferences/index.html'));
  preferencesWindow.on('closed', () => {
    preferencesWindow = null;
  });

  return preferencesWindow;
}

module.exports = { createOrShowPreferencesWindow };
