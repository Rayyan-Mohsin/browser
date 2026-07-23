'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BookmarksStore } = require('../src/main/store/bookmarks');

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bookmarks-test-')), 'bookmarks.json');
}

test('starts with a root folder and no bookmarks', () => {
  const store = new BookmarksStore(tmpFile());
  const { folders, bookmarks } = store.list();
  assert.equal(folders.length, 1);
  assert.equal(folders[0].id, 'root');
  assert.deepEqual(bookmarks, []);
});

test('add creates a bookmark with an id and timestamp', () => {
  const store = new BookmarksStore(tmpFile());
  const bookmark = store.add({ url: 'https://example.com', title: 'Example' });
  assert.ok(bookmark.id.startsWith('b_'));
  assert.equal(bookmark.url, 'https://example.com');
  assert.equal(bookmark.folderId, 'root');
  assert.ok(bookmark.createdAt > 0);
  assert.equal(store.list().bookmarks.length, 1);
});

test('add requires url and title', () => {
  const store = new BookmarksStore(tmpFile());
  assert.throws(() => store.add({ url: 'https://example.com' }));
  assert.throws(() => store.add({ title: 'Example' }));
});

test('remove deletes a bookmark by id', () => {
  const store = new BookmarksStore(tmpFile());
  const bookmark = store.add({ url: 'https://example.com', title: 'Example' });
  store.remove(bookmark.id);
  assert.equal(store.list().bookmarks.length, 0);
});

test('update patches an existing bookmark', () => {
  const store = new BookmarksStore(tmpFile());
  const bookmark = store.add({ url: 'https://example.com', title: 'Example' });
  const updated = store.update(bookmark.id, { title: 'Renamed' });
  assert.equal(updated.title, 'Renamed');
  assert.equal(updated.id, bookmark.id);
});

test('update throws for an unknown id', () => {
  const store = new BookmarksStore(tmpFile());
  assert.throws(() => store.update('missing', { title: 'x' }));
});

test('createFolder adds a new folder', () => {
  const store = new BookmarksStore(tmpFile());
  const folder = store.createFolder({ name: 'Work' });
  assert.ok(folder.id.startsWith('f_'));
  assert.equal(store.list().folders.length, 2);
});

test('bookmarks persist across store instances', () => {
  const file = tmpFile();
  const store = new BookmarksStore(file);
  store.add({ url: 'https://example.com', title: 'Example' });
  const reloaded = new BookmarksStore(file);
  assert.equal(reloaded.list().bookmarks.length, 1);
});
