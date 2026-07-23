'use strict';

const { registerTabHandlers } = require('./tabHandlers');
const { registerBookmarkHandlers } = require('./bookmarkHandlers');
const { registerSettingsHandlers } = require('./settingsHandlers');
const { registerThemeHandlers } = require('./themeHandlers');
const { registerExtensionHandlers } = require('./extensionHandlers');
const { registerUiHandlers } = require('./uiHandlers');

function registerIpcHandlers({
  tabManager,
  bookmarksStore,
  settingsStore,
  extensionManager,
  win,
  chromeWebContents,
}) {
  registerTabHandlers(tabManager);
  registerBookmarkHandlers(bookmarksStore);
  registerSettingsHandlers(settingsStore);
  const theme = registerThemeHandlers(settingsStore, chromeWebContents);
  registerExtensionHandlers(extensionManager, win);
  registerUiHandlers(tabManager);
  return { theme };
}

module.exports = { registerIpcHandlers };
