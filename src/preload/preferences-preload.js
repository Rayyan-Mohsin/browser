'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Deliberately its own, narrower allowlist -- this window is a separate,
// less-trusted-by-default surface from the main browser chrome, so it only
// gets exactly the channels it needs (principle of least privilege).
const INVOKE_CHANNELS = new Set([
  'settings:get',
  'settings:set',
  'history:list',
  'history:clear',
  'history:removeEntry',
  'advanced:setHistoryRetention',
  'advanced:getVersionInfo',
  'advanced:resetSettings',
]);

contextBridge.exposeInMainWorld('preferencesAPI', {
  invoke(channel, payload) {
    if (!INVOKE_CHANNELS.has(channel)) {
      throw new Error(`Blocked IPC invoke on unknown channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, payload);
  },
});
