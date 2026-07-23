'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { uniquePath } = require('../src/main/downloads/uniquePath');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unique-path-test-'));
}

test('returns the plain path when nothing collides', () => {
  const dir = tmpDir();
  assert.equal(uniquePath(dir, 'report.pdf'), path.join(dir, 'report.pdf'));
});

test('appends (1) when the file already exists', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'report.pdf'), '');
  assert.equal(uniquePath(dir, 'report.pdf'), path.join(dir, 'report (1).pdf'));
});

test('increments past multiple existing collisions', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'report.pdf'), '');
  fs.writeFileSync(path.join(dir, 'report (1).pdf'), '');
  fs.writeFileSync(path.join(dir, 'report (2).pdf'), '');
  assert.equal(uniquePath(dir, 'report.pdf'), path.join(dir, 'report (3).pdf'));
});

test('handles filenames with no extension', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'archive'), '');
  assert.equal(uniquePath(dir, 'archive'), path.join(dir, 'archive (1)'));
});
