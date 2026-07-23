'use strict';

// Fallback header height used only until the chrome renderer measures its
// own real rendered height and reports it via the ui:setHeaderHeight IPC
// channel (see chrome.js / TabManager.setHeaderHeight). The header's actual
// height depends on CSS that can change (button sizing, compact tab style,
// bookmarks bar visibility), so it is not hardcoded anywhere else.
const HEADER_HEIGHT = 104;

const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=%s';

module.exports = { HEADER_HEIGHT, DEFAULT_SEARCH_ENGINE };
