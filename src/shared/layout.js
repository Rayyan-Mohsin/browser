'use strict';

// Single source of truth for the chrome view's header height. Must stay in
// sync with --header-height in src/renderer/chrome/theme.css.
const HEADER_HEIGHT = 84;

const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=%s';

module.exports = { HEADER_HEIGHT, DEFAULT_SEARCH_ENGINE };
