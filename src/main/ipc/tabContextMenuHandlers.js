'use strict';

const { ipcMain, Menu } = require('electron');

/**
 * Native right-click menu for a tab pill. This is the *only* UI surface for
 * tab grouping -- deliberately not a persistent button/toolbar, so it's
 * there if you want it and invisible otherwise.
 */
function registerTabContextMenuHandlers(tabManager, win) {
  ipcMain.handle('tabs:showContextMenu', (_e, { id }) => {
    const tab = tabManager.list().find((t) => t.id === id);
    if (!tab) return;

    const template = [];

    if (tab.groupId) {
      template.push({
        label: 'Remove from Group',
        click: () => tabManager.removeTabFromGroup(id),
      });
    } else {
      template.push({
        label: 'New Group from Tab',
        click: () => tabManager.createGroupForTab(id),
      });
    }

    const otherGroups = tabManager.listGroups().filter((g) => g.id !== tab.groupId);
    if (otherGroups.length > 0) {
      template.push({
        label: 'Add to Group',
        submenu: otherGroups.map((g) => ({
          label: g.name,
          click: () => tabManager.addTabToGroup(id, g.id),
        })),
      });
    }

    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

module.exports = { registerTabContextMenuHandlers };
