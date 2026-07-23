'use strict';

const crypto = require('crypto');
const { Store } = require('./Store');

const MAX_ENTRIES = 500;

const DEFAULTS = {
  version: 1,
  entries: [],
};

class HistoryStore {
  constructor(filePath) {
    this.store = new Store(filePath, DEFAULTS);
  }

  list() {
    // Newest first.
    return [...this.store.get().entries].reverse();
  }

  add({ url, title, favicon = null }) {
    if (!url) return;
    const { entries } = this.store.get();
    const last = entries[entries.length - 1];
    // Collapse consecutive visits to the same URL (e.g. did-navigate firing
    // repeatedly for redirects/hash changes) into a single, updated entry.
    if (last && last.url === url) {
      last.title = title || last.title;
      last.favicon = favicon || last.favicon;
      last.visitedAt = Date.now();
      this.store.set({ entries });
      return;
    }
    const entry = {
      id: `h_${crypto.randomUUID()}`,
      url,
      title: title || url,
      favicon,
      visitedAt: Date.now(),
    };
    const next = [...entries, entry].slice(-MAX_ENTRIES);
    this.store.set({ entries: next });
  }

  clear() {
    this.store.set({ entries: [] });
  }
}

module.exports = { HistoryStore };
