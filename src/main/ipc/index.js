'use strict';

const { registerTabHandlers } = require('./tabHandlers');
const { registerBookmarkHandlers } = require('./bookmarkHandlers');
const { registerSettingsHandlers } = require('./settingsHandlers');
const { registerThemeHandlers } = require('./themeHandlers');
const { registerExtensionHandlers } = require('./extensionHandlers');
const { registerUiHandlers } = require('./uiHandlers');
const { registerHistoryHandlers } = require('./historyHandlers');
const { registerDownloadsHandlers } = require('./downloadsHandlers');
const { registerPrivacyHandlers } = require('./privacyHandlers');
const { registerPageHandlers } = require('./pageHandlers');
const { registerAdvancedHandlers } = require('./advancedHandlers');
const { registerTabContextMenuHandlers } = require('./tabContextMenuHandlers');

function registerIpcHandlers({
  tabManager,
  bookmarksStore,
  settingsStore,
  extensionManager,
  historyStore,
  downloadManager,
  session,
  win,
  chromeWebContents,
}) {
  registerTabHandlers(tabManager);
  registerBookmarkHandlers(bookmarksStore);
  registerSettingsHandlers(settingsStore);
  const theme = registerThemeHandlers(settingsStore, chromeWebContents);
  registerExtensionHandlers(extensionManager, win);
  registerUiHandlers(tabManager);
  registerHistoryHandlers(historyStore);
  registerDownloadsHandlers(downloadManager);
  registerPrivacyHandlers(session, historyStore);
  registerPageHandlers(win);
  registerAdvancedHandlers(settingsStore, historyStore);
  registerTabContextMenuHandlers(tabManager, win);
  return { theme };
}

module.exports = { registerIpcHandlers };
