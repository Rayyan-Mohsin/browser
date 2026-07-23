'use strict';

const { Store } = require('./Store');
const { DEFAULT_SEARCH_ENGINE } = require('../../shared/layout');

const DEFAULTS = {
  version: 1,
  theme: { mode: 'system', custom: null },
  window: { width: 1280, height: 800, x: null, y: null },
  showBookmarksBar: true,
  searchEngine: DEFAULT_SEARCH_ENGINE,
  extensions: [],
};

class SettingsStore {
  constructor(filePath) {
    this.store = new Store(filePath, DEFAULTS);
  }

  get() {
    return this.store.get();
  }

  set(patch) {
    return this.store.set(patch);
  }

  setTheme(patch) {
    const current = this.store.get().theme;
    return this.store.set({ theme: { ...current, ...patch } }).theme;
  }
}

module.exports = { SettingsStore };
