'use strict';

const path = require('path');
const crypto = require('crypto');
const { shell } = require('electron');
const { Store } = require('../store/Store');
const { uniquePath } = require('./uniquePath');

const MAX_ENTRIES = 200;

const DEFAULTS = {
  version: 1,
  entries: [],
};

class DownloadManager {
  constructor(filePath, downloadsDir) {
    this.store = new Store(filePath, DEFAULTS);
    this.downloadsDir = downloadsDir;
  }

  list() {
    return [...this.store.get().entries].reverse();
  }

  _upsert(entry) {
    const { entries } = this.store.get();
    const idx = entries.findIndex((e) => e.id === entry.id);
    const next = idx === -1 ? [...entries, entry] : entries.map((e, i) => (i === idx ? entry : e));
    this.store.set({ entries: next.slice(-MAX_ENTRIES) });
  }

  /** Wire this to session.on('will-download', (event, item) => manager.trackItem(item)). */
  trackItem(item) {
    const id = crypto.randomUUID();
    const savePath = uniquePath(this.downloadsDir, item.getFilename());
    item.setSavePath(savePath);

    const snapshot = () => ({
      id,
      filename: path.basename(savePath),
      path: savePath,
      state: item.isPaused() ? 'paused' : item.getState(),
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
      startTime: Date.now(),
    });

    this._upsert(snapshot());
    item.on('updated', () => this._upsert(snapshot()));
    item.once('done', () => this._upsert(snapshot()));
  }

  openFile(id) {
    const entry = this.store.get().entries.find((e) => e.id === id);
    if (entry) shell.openPath(entry.path);
  }

  showInFolder(id) {
    const entry = this.store.get().entries.find((e) => e.id === id);
    if (entry) shell.showItemInFolder(entry.path);
  }

  clear() {
    this.store.set({ entries: [] });
  }
}

module.exports = { DownloadManager };
