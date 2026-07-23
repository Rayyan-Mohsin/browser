'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/main/store/Store');

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'store-test-')), 'data.json');
}

test('Store returns defaults when file does not exist', () => {
  const store = new Store(tmpFile(), { count: 0 });
  assert.deepEqual(store.get(), { count: 0 });
});

test('Store persists writes atomically and survives reload', () => {
  const file = tmpFile();
  const store = new Store(file, { count: 0 });
  store.set({ count: 5 });
  assert.equal(fs.existsSync(`${file}.tmp`), false);
  const reloaded = new Store(file, { count: 0 });
  assert.deepEqual(reloaded.get(), { count: 5 });
});

test('Store merges partial patches', () => {
  const store = new Store(tmpFile(), { a: 1, b: 2 });
  store.set({ b: 3 });
  assert.deepEqual(store.get(), { a: 1, b: 3 });
});

test('Store falls back to defaults and backs up a corrupt file', () => {
  const file = tmpFile();
  fs.writeFileSync(file, 'not json');
  const store = new Store(file, { count: 0 });
  assert.deepEqual(store.get(), { count: 0 });
  assert.equal(fs.existsSync(`${file}.bak`), true);
});
