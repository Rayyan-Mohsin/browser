'use strict';

// Fallback header height used only until the chrome renderer measures its
// own real rendered height and reports it via the ui:setHeaderHeight IPC
// channel (see chrome.js / TabManager.setHeaderHeight). The header's actual
// height depends on CSS that can change (button sizing, compact tab style,
// bookmarks bar visibility), so it is not hardcoded anywhere else.
const HEADER_HEIGHT = 104;

// Preset search engines offered in Settings. 'custom' is handled separately
// (the user supplies their own %s template), so it isn't listed here.
const SEARCH_ENGINES = {
  google: { label: 'Google', template: 'https://www.google.com/search?q=%s' },
  bing: { label: 'Bing', template: 'https://www.bing.com/search?q=%s' },
  duckduckgo: { label: 'DuckDuckGo', template: 'https://duckduckgo.com/?q=%s' },
};

const DEFAULT_SEARCH_ENGINE_ID = 'google';
const DEFAULT_SEARCH_ENGINE = SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE_ID].template;

module.exports = {
  HEADER_HEIGHT,
  SEARCH_ENGINES,
  DEFAULT_SEARCH_ENGINE_ID,
  DEFAULT_SEARCH_ENGINE,
};
