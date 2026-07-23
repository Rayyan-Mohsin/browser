'use strict';

const { Store } = require('./Store');
const { DEFAULT_SEARCH_ENGINE, DEFAULT_SEARCH_ENGINE_ID } = require('../../shared/layout');

const DEFAULTS = {
  version: 1,
  theme: { mode: 'system', custom: null },
  window: { width: 1280, height: 800, x: null, y: null },
  showBookmarksBar: true,
  searchEngineId: DEFAULT_SEARCH_ENGINE_ID, // 'google' | 'bing' | 'duckduckgo' | 'custom'
  searchEngine: DEFAULT_SEARCH_ENGINE, // resolved %s template, used directly by urlNormalize
  customSearchEngine: '', // user's own %s template, used when searchEngineId is 'custom'
  tabBarLayout: 'separate', // 'separate' | 'compact' (Safari-style)
  extensions: [],
  // Advanced-settings-window-only fields (not exposed in the in-app panel):
  historyRetentionDays: null, // null = keep forever; else auto-prune older entries
  clearDataOnQuit: false,
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

  reset() {
    return this.store.reset();
  }
}

module.exports = { SettingsStore };
