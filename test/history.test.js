'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HistoryStore } = require('../src/main/store/history');

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'history-test-')), 'history.json');
}

test('starts empty', () => {
  const store = new HistoryStore(tmpFile());
  assert.deepEqual(store.list(), []);
});

test('add records a visit, newest first', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ url: 'https://a.com', title: 'A' });
  store.add({ url: 'https://b.com', title: 'B' });
  const entries = store.list();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].url, 'https://b.com'); // newest first
  assert.ok(entries[0].id.startsWith('h_'));
  assert.ok(entries[0].visitedAt > 0);
});

test('consecutive visits to the same url collapse into one entry', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ url: 'https://a.com', title: 'A' });
  store.add({ url: 'https://a.com', title: 'A updated' });
  const entries = store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, 'A updated');
});

test('add without a url is a no-op', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ title: 'no url' });
  assert.deepEqual(store.list(), []);
});

test('clear empties history', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ url: 'https://a.com', title: 'A' });
  store.clear();
  assert.deepEqual(store.list(), []);
});

test('history persists across store instances', () => {
  const file = tmpFile();
  const store = new HistoryStore(file);
  store.add({ url: 'https://a.com', title: 'A' });
  const reloaded = new HistoryStore(file);
  assert.equal(reloaded.list().length, 1);
});
