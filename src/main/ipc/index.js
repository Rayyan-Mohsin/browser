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
const { registerGroupHandlers } = require('./groupHandlers');

/**
 * Registers every IPC channel exactly once for the app's whole lifetime
 * (`ipcMain.handle` throws if the same channel is registered twice, which is
 * why this is called once at startup rather than once per window). Handlers
 * for per-window concerns (tabs, ui, page, extensions dialogs, context menu,
 * groups) look up the calling window's own TabManager/BrowserWindow via
 * `windowRegistry.getContext(event.sender.id)`; handlers for app-wide shared
 * state (bookmarks, settings, history, downloads, privacy, advanced) close
 * directly over the single shared store instances instead.
 */
function registerIpcHandlers({ bookmarksStore, settingsStore, extensionManager, historyStore, downloadManager, session }) {
  registerTabHandlers();
  registerBookmarkHandlers(bookmarksStore);
  registerSettingsHandlers(settingsStore);
  const theme = registerThemeHandlers(settingsStore);
  registerExtensionHandlers(extensionManager);
  registerUiHandlers();
  registerHistoryHandlers(historyStore);
  registerDownloadsHandlers(downloadManager);
  registerPrivacyHandlers(session, historyStore);
  registerPageHandlers();
  registerAdvancedHandlers(settingsStore, historyStore);
  registerTabContextMenuHandlers();
  registerGroupHandlers();
  return { theme };
}

module.exports = { registerIpcHandlers };
