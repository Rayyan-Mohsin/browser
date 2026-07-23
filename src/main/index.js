'use strict';

const { app, session, Menu } = require('electron');
const { createMainWindow } = require('./windows/mainWindow');
const { TabManager } = require('./tabs/TabManager');
const { BookmarksStore } = require('./store/bookmarks');
const { SettingsStore } = require('./store/settings');
const { HistoryStore } = require('./store/history');
const { DownloadManager } = require('./downloads/DownloadManager');
const { ExtensionManager } = require('./extensions/ExtensionManager');
const { registerIpcHandlers } = require('./ipc');
const { buildAppMenu } = require('./menu/appMenu');
const { getUserDataPath } = require('./util/paths');

app.whenReady().then(async () => {
  const bookmarksStore = new BookmarksStore(getUserDataPath('bookmarks.json'));
  const settingsStore = new SettingsStore(getUserDataPath('settings.json'));
  const historyStore = new HistoryStore(getUserDataPath('history.json'));
  const downloadManager = new DownloadManager(getUserDataPath('downloads.json'), app.getPath('downloads'));

  const { win, chromeView } = createMainWindow();

  const tabManager = new TabManager(win, {
    getSearchEngine: () => settingsStore.get().searchEngine,
    onTabsUpdated: (tabs) => chromeView.webContents.send('tabs:updated', tabs),
    onActiveChanged: (id) => chromeView.webContents.send('tabs:active-changed', { id }),
    onNavigate: (entry) => historyStore.add(entry),
  });
  win.on('resize', () => tabManager.resizeActiveView());

  session.defaultSession.on('will-download', (_event, item) => downloadManager.trackItem(item));

  const extensionManager = new ExtensionManager(session.defaultSession, settingsStore);
  await extensionManager.restoreExtensions();

  registerIpcHandlers({
    tabManager,
    bookmarksStore,
    settingsStore,
    extensionManager,
    historyStore,
    downloadManager,
    session: session.defaultSession,
    win,
    chromeWebContents: chromeView.webContents,
  });

  Menu.setApplicationMenu(buildAppMenu(tabManager));

  tabManager.createTab();
}).catch((err) => {
  // Without this, a thrown error here silently leaves the app running with
  // no window and no visible diagnostic.
  console.error('Failed to initialize app:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
