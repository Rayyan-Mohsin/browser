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

test('removeEntry deletes a single entry by id', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ url: 'https://a.com', title: 'A' });
  store.add({ url: 'https://b.com', title: 'B' });
  const [newest] = store.list();
  store.removeEntry(newest.id);
  const remaining = store.list();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].url, 'https://a.com');
});

test('pruneOlderThan removes entries past the retention window', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ url: 'https://old.com', title: 'Old' });
  // Backdate the entry directly via the underlying store to simulate age.
  const data = store.store.get();
  data.entries[0].visitedAt = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
  store.store.set({ entries: data.entries });
  store.add({ url: 'https://new.com', title: 'New' });

  store.pruneOlderThan(7);
  const remaining = store.list();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].url, 'https://new.com');
});

test('pruneOlderThan(null) is a no-op', () => {
  const store = new HistoryStore(tmpFile());
  store.add({ url: 'https://a.com', title: 'A' });
  store.pruneOlderThan(null);
  assert.equal(store.list().length, 1);
});
