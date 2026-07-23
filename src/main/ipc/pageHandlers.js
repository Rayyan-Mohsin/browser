'use strict';

const { ipcMain, ShareMenu } = require('electron');
const { getContext } = require('../windows/windowRegistry');

/** Native macOS share sheet (Mail, Messages, AirDrop, etc.) for the current page. */
function registerPageHandlers() {
  ipcMain.handle('page:share', (e, { url, title }) => {
    const ctx = getContext(e.sender.id);
    if (!ctx) return { error: 'No window found for this request.' };
    try {
      const menu = new ShareMenu({ urls: [url], texts: title ? [title] : [] });
      menu.popup({ window: ctx.win });
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { registerPageHandlers };
