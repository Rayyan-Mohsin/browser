'use strict';

const { ipcMain } = require('electron');
const { getContext } = require('../windows/windowRegistry');

function registerGroupHandlers() {
  ipcMain.handle('groups:rename', (e, { groupId, name }) => getContext(e.sender.id)?.tabManager.renameGroup(groupId, name));
  ipcMain.handle('groups:addTab', (e, { id, groupId }) => getContext(e.sender.id)?.tabManager.addTabToGroup(id, groupId));
  ipcMain.handle('groups:removeTab', (e, { id }) => getContext(e.sender.id)?.tabManager.removeTabFromGroup(id));
  ipcMain.handle('groups:toggleCollapse', (e, { groupId }) => getContext(e.sender.id)?.tabManager.toggleGroupCollapsed(groupId));
  ipcMain.handle('groups:ungroup', (e, { groupId }) => getContext(e.sender.id)?.tabManager.ungroupAll(groupId));
}

module.exports = { registerGroupHandlers };
