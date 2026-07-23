'use strict';

const { ipcMain } = require('electron');
const { getContext } = require('../windows/windowRegistry');

function registerGroupHandlers() {
  ipcMain.handle('groups:rename', (e, { groupId, name }) => getContext(e.sender.id)?.tabManager.renameGroup(groupId, name));
  ipcMain.handle('groups:addTab', (e, { id, groupId }) => getContext(e.sender.id)?.tabManager.addTabToGroup(id, groupId));
}

module.exports = { registerGroupHandlers };
