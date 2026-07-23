'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeInput, looksLikeUrl } = require('../src/main/tabs/urlNormalize');

const SEARCH = 'https://www.google.com/search?q=%s';

test('passes through fully-qualified URLs unchanged', () => {
  assert.equal(normalizeInput('https://example.com', SEARCH), 'https://example.com');
  assert.equal(normalizeInput('http://example.com/path?x=1', SEARCH), 'http://example.com/path?x=1');
});

test('adds https:// to bare domains', () => {
  assert.equal(normalizeInput('example.com', SEARCH), 'https://example.com');
  assert.equal(normalizeInput('sub.example.com/path', SEARCH), 'https://sub.example.com/path');
});

test('treats localhost with a port as a URL', () => {
  assert.equal(normalizeInput('localhost:3000', SEARCH), 'https://localhost:3000');
});

test('treats plain search terms as search queries', () => {
  assert.equal(
    normalizeInput('best pizza near me', SEARCH),
    'https://www.google.com/search?q=best%20pizza%20near%20me'
  );
});

test('treats single words without a dot as search queries', () => {
  assert.equal(normalizeInput('electron', SEARCH), 'https://www.google.com/search?q=electron');
});

test('looksLikeUrl rejects strings containing spaces', () => {
  assert.equal(looksLikeUrl('example.com is nice'), false);
});

test('empty input falls back to a blank search', () => {
  assert.equal(normalizeInput('   ', SEARCH), 'https://www.google.com/search?q=');
});
