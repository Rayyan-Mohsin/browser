'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Minimal atomic JSON file store. No external dependency (electron-store is
 * intentionally avoided to keep the app's runtime dependency tree empty).
 */
class Store {
  constructor(filePath, defaults) {
    this.filePath = filePath;
    this.defaults = defaults;
    this.data = this._read();
  }

  _read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...this.defaults, ...parsed };
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Corrupt file: back it up so we don't silently destroy user data,
        // then fall back to defaults.
        try {
          fs.copyFileSync(this.filePath, `${this.filePath}.bak`);
        } catch (_) {
          // best-effort; nothing else we can do here
        }
      }
      return { ...this.defaults };
    }
  }

  get() {
    return this.data;
  }

  set(patch) {
    this.data = { ...this.data, ...patch };
    this._writeAtomic(this.data);
    return this.data;
  }

  _writeAtomic(data) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.filePath);
  }
}

module.exports = { Store };
