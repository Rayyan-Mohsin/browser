'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Loads unpacked Chrome/WebExtensions via Electron's session.loadExtension.
 *
 * Two hard platform limitations, not bugs to be fixed later:
 *  - There is no one-click Chrome Web Store install in Electron; that flow
 *    is proprietary to Google Chrome's installer/protocol.
 *  - Electron executes background/content scripts and permissions fully,
 *    but does not render Chrome-style toolbar action buttons/popups out of
 *    the box (a v2 option is the community package electron-chrome-extensions).
 */
class ExtensionManager {
  constructor(session, settingsStore) {
    this.session = session;
    this.settingsStore = settingsStore;
    this.loaded = new Map();
  }

  async loadExtension(extensionPath) {
    const manifestPath = path.join(extensionPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return { error: `No manifest.json found in ${extensionPath}` };
    }
    try {
      const ext = await this.session.loadExtension(extensionPath, { allowFileAccess: true });
      const info = {
        id: ext.id,
        path: extensionPath,
        name: ext.name,
        version: ext.version,
        enabled: true,
      };
      this.loaded.set(ext.id, info);
      this._persist();
      return info;
    } catch (err) {
      return { error: err.message };
    }
  }

  async restoreExtensions() {
    const { extensions } = this.settingsStore.get();
    for (const entry of extensions || []) {
      if (!entry.enabled || !fs.existsSync(entry.path)) continue;
      try {
        const ext = await this.session.loadExtension(entry.path, { allowFileAccess: true });
        this.loaded.set(ext.id, { ...entry, id: ext.id, name: ext.name, version: ext.version });
      } catch (_) {
        // Broken/missing extension folder: skip rather than crash startup.
      }
    }
  }

  removeExtension(id) {
    if (!this.loaded.has(id)) return;
    try {
      this.session.removeExtension(id);
    } catch (_) {
      // already unloaded; nothing to do
    }
    this.loaded.delete(id);
    this._persist();
  }

  listExtensions() {
    return Array.from(this.loaded.values());
  }

  _persist() {
    this.settingsStore.set({ extensions: this.listExtensions() });
  }
}

module.exports = { ExtensionManager };
