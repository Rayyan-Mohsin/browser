'use strict';

const { ipcMain } = require('electron');

function registerBookmarkHandlers(bookmarksStore) {
  ipcMain.handle('bookmarks:add', (_e, payload) => bookmarksStore.add(payload));
  ipcMain.handle('bookmarks:remove', (_e, { id }) => bookmarksStore.remove(id));
  ipcMain.handle('bookmarks:update', (_e, { id, patch }) => bookmarksStore.update(id, patch));
  ipcMain.handle('bookmarks:list', () => bookmarksStore.list());
  ipcMain.handle('bookmarks:createFolder', (_e, payload) => bookmarksStore.createFolder(payload));
}

module.exports = { registerBookmarkHandlers };
