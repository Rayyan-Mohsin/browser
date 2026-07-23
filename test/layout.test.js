'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SEARCH_ENGINES, DEFAULT_SEARCH_ENGINE_ID, DEFAULT_SEARCH_ENGINE } = require('../src/shared/layout');

test('every preset search engine template has a %s placeholder', () => {
  for (const [id, engine] of Object.entries(SEARCH_ENGINES)) {
    assert.ok(engine.template.includes('%s'), `${id} template missing %s`);
    assert.ok(engine.label.length > 0);
  }
});

test('default search engine id resolves to a known preset', () => {
  assert.ok(SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE_ID]);
  assert.equal(DEFAULT_SEARCH_ENGINE, SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE_ID].template);
});
