'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = new Set([
  'tabs:create', 'tabs:close', 'tabs:switch', 'tabs:list', 'tabs:navigate',
  'tabs:reload', 'tabs:stop', 'tabs:goBack', 'tabs:goForward', 'tabs:showContextMenu',
  'bookmarks:add', 'bookmarks:remove', 'bookmarks:update', 'bookmarks:list', 'bookmarks:createFolder',
  'settings:get', 'settings:set', 'settings:setSearchEngine',
  'theme:get', 'theme:set',
  'extensions:openLoadDialog', 'extensions:load', 'extensions:list', 'extensions:remove',
  'ui:setHeaderHeight', 'ui:setOverlayOpen',
  'history:list', 'history:clear',
  'downloads:list', 'downloads:openFile', 'downloads:showInFolder',
  'privacy:clearData',
  'page:share',
  'tabs:moveTab', 'groups:rename', 'groups:addTab', 'groups:removeTab',
  'groups:toggleCollapse', 'groups:ungroup', 'groups:showContextMenu',
]);

const EVENT_CHANNELS = new Set([
  'tabs:updated', 'tabs:active-changed', 'theme:changed', 'address-bar:focus', 'group:promptRename',
]);

contextBridge.exposeInMainWorld('browserAPI', {
  invoke(channel, payload) {
    if (!INVOKE_CHANNELS.has(channel)) {
      throw new Error(`Blocked IPC invoke on unknown channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, payload);
  },
  on(channel, callback) {
    if (!EVENT_CHANNELS.has(channel)) {
      throw new Error(`Blocked IPC subscribe on unknown channel: ${channel}`);
    }
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
