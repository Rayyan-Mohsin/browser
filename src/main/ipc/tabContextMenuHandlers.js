'use strict';

const { ipcMain, Menu } = require('electron');
const { getContext } = require('../windows/windowRegistry');

/**
 * Native right-click menus for managing tab groups: one on a tab pill
 * itself, one on a group's chip (see groupChip.js) for when its tabs are
 * collapsed and not individually clickable. There's still no persistent
 * grouping button/toolbar -- it's there if you use it, invisible otherwise.
 */
function registerTabContextMenuHandlers() {
  ipcMain.handle('tabs:showContextMenu', (e, { id }) => {
    const ctx = getContext(e.sender.id);
    if (!ctx) return;
    const { tabManager, win, chromeView } = ctx;
    const tab = tabManager.list().find((t) => t.id === id);
    if (!tab) return;

    const template = [];

    if (tab.groupId) {
      template.push({
        label: tab.groupCollapsed ? 'Expand Group' : 'Collapse Group',
        click: () => tabManager.toggleGroupCollapsed(tab.groupId),
      });
      template.push({
        label: 'Rename Group…',
        click: () => chromeView.webContents.send('group:promptRename', { groupId: tab.groupId, name: tab.groupName }),
      });
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

  /** Right-click menu on a group's own chip -- the only way to manage a group while it's collapsed. */
  ipcMain.handle('groups:showContextMenu', (e, { groupId }) => {
    const ctx = getContext(e.sender.id);
    if (!ctx) return;
    const { tabManager, win, chromeView } = ctx;
    const group = tabManager.listGroups().find((g) => g.id === groupId);
    if (!group) return;

    const template = [
      {
        label: group.collapsed ? 'Expand Group' : 'Collapse Group',
        click: () => tabManager.toggleGroupCollapsed(groupId),
      },
      {
        label: 'Rename Group…',
        click: () => chromeView.webContents.send('group:promptRename', { groupId, name: group.name }),
      },
      { type: 'separator' },
      {
        label: 'Ungroup',
        click: () => tabManager.ungroupAll(groupId),
      },
    ];

    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

module.exports = { registerTabContextMenuHandlers };
