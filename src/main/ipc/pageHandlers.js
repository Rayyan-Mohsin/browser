'use strict';

const { ipcMain, ShareMenu } = require('electron');

/** Native macOS share sheet (Mail, Messages, AirDrop, etc.) for the current page. */
function registerPageHandlers(win) {
  ipcMain.handle('page:share', (_e, { url, title }) => {
    try {
      const menu = new ShareMenu({ urls: [url], texts: title ? [title] : [] });
      menu.popup({ window: win });
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { registerPageHandlers };
