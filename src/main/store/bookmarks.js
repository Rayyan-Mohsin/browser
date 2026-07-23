'use strict';

const crypto = require('crypto');
const { Store } = require('./Store');

const DEFAULTS = {
  version: 1,
  folders: [{ id: 'root', name: 'Bookmarks Bar', parentId: null }],
  bookmarks: [],
};

class BookmarksStore {
  constructor(filePath) {
    this.store = new Store(filePath, DEFAULTS);
  }

  list() {
    const { folders, bookmarks } = this.store.get();
    return { folders, bookmarks };
  }

  add({ url, title, favicon = null, folderId = 'root' }) {
    if (!url || !title) throw new Error('Bookmark requires url and title');
    const { bookmarks } = this.store.get();
    const bookmark = {
      id: `b_${crypto.randomUUID()}`,
      title,
      url,
      favicon,
      folderId,
      createdAt: Date.now(),
    };
    this.store.set({ bookmarks: [...bookmarks, bookmark] });
    return bookmark;
  }

  remove(id) {
    const { bookmarks } = this.store.get();
    this.store.set({ bookmarks: bookmarks.filter((b) => b.id !== id) });
  }

  update(id, patch) {
    const { bookmarks } = this.store.get();
    let updated = null;
    const next = bookmarks.map((b) => {
      if (b.id !== id) return b;
      updated = { ...b, ...patch, id: b.id };
      return updated;
    });
    if (!updated) throw new Error(`Bookmark not found: ${id}`);
    this.store.set({ bookmarks: next });
    return updated;
  }

  createFolder({ name, parentId = null }) {
    if (!name) throw new Error('Folder requires a name');
    const { folders } = this.store.get();
    const folder = { id: `f_${crypto.randomUUID()}`, name, parentId };
    this.store.set({ folders: [...folders, folder] });
    return folder;
  }
}

module.exports = { BookmarksStore };
