'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SettingsStore } = require('../src/main/store/settings');

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'settings-test-')), 'settings.json');
}

test('defaults include a separate tab bar layout, google search, and system theme', () => {
  const store = new SettingsStore(tmpFile());
  const settings = store.get();
  assert.equal(settings.tabBarLayout, 'separate');
  assert.equal(settings.searchEngineId, 'google');
  assert.equal(settings.searchEngine, 'https://www.google.com/search?q=%s');
  assert.equal(settings.theme.mode, 'system');
  assert.equal(settings.showBookmarksBar, true);
});

test('set merges a partial patch', () => {
  const store = new SettingsStore(tmpFile());
  store.set({ tabBarLayout: 'compact' });
  assert.equal(store.get().tabBarLayout, 'compact');
  assert.equal(store.get().showBookmarksBar, true); // untouched fields survive
});

test('setTheme merges into the nested theme object', () => {
  const store = new SettingsStore(tmpFile());
  store.setTheme({ mode: 'dark' });
  assert.equal(store.get().theme.mode, 'dark');
  assert.equal(store.get().theme.custom, null);
});

test('settings persist across store instances', () => {
  const file = tmpFile();
  const store = new SettingsStore(file);
  store.set({ tabBarLayout: 'compact' });
  const reloaded = new SettingsStore(file);
  assert.equal(reloaded.get().tabBarLayout, 'compact');
});
