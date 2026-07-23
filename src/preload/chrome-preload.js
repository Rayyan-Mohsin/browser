'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = new Set([
  'tabs:create', 'tabs:close', 'tabs:switch', 'tabs:list', 'tabs:navigate',
  'tabs:reload', 'tabs:stop', 'tabs:goBack', 'tabs:goForward',
  'bookmarks:add', 'bookmarks:remove', 'bookmarks:update', 'bookmarks:list', 'bookmarks:createFolder',
  'settings:get', 'settings:set',
  'theme:get', 'theme:set',
  'extensions:openLoadDialog', 'extensions:load', 'extensions:list', 'extensions:remove',
  'ui:setHeaderHeight', 'ui:setOverlayOpen',
]);

const EVENT_CHANNELS = new Set(['tabs:updated', 'tabs:active-changed', 'theme:changed']);

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
