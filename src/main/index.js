'use strict';

const { app, session, Menu, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/mainWindow');
const { createOrShowPreferencesWindow } = require('./windows/preferencesWindow');
const { TabManager } = require('./tabs/TabManager');
const { BookmarksStore } = require('./store/bookmarks');
const { SettingsStore } = require('./store/settings');
const { HistoryStore } = require('./store/history');
const { DownloadManager } = require('./downloads/DownloadManager');
const { ExtensionManager } = require('./extensions/ExtensionManager');
const { registerIpcHandlers } = require('./ipc');
const { buildAppMenu } = require('./menu/appMenu');
const { getUserDataPath } = require('./util/paths');
const { registerWindow } = require('./windows/windowRegistry');

app.whenReady().then(async () => {
  const bookmarksStore = new BookmarksStore(getUserDataPath('bookmarks.json'));
  const settingsStore = new SettingsStore(getUserDataPath('settings.json'));
  const historyStore = new HistoryStore(getUserDataPath('history.json'));
  const downloadManager = new DownloadManager(getUserDataPath('downloads.json'), app.getPath('downloads'));

  // "Periodic" history deletion (Advanced Settings -> History Retention):
  // applied once per launch, which is the natural cadence for a desktop app
  // that isn't always running, plus immediately whenever the setting changes
  // (see advancedHandlers.js).
  historyStore.pruneOlderThan(settingsStore.get().historyRetentionDays);

  const extensionManager = new ExtensionManager(session.defaultSession, settingsStore);
  await extensionManager.restoreExtensions();

  session.defaultSession.on('will-download', (_event, item) => downloadManager.trackItem(item));

  // Every IPC channel is registered exactly once for the app's whole
  // lifetime here; per-window handlers resolve which window called them via
  // windowRegistry (see ipc/index.js), which is what lets each new browser
  // window (File > New Window) work without re-registering any channel.
  registerIpcHandlers({
    bookmarksStore,
    settingsStore,
    extensionManager,
    historyStore,
    downloadManager,
    session: session.defaultSession,
  });

  /** Creates one fully independent browser window: its own TabManager, its own initial tab. */
  function createAppWindow() {
    const { win, chromeView } = createMainWindow();

    const tabManager = new TabManager(win, {
      getSearchEngine: () => settingsStore.get().searchEngine,
      getOpenLinksInBackground: () => settingsStore.get().openLinksInBackground,
      onTabsUpdated: (tabs) => chromeView.webContents.send('tabs:updated', tabs),
      onActiveChanged: (id) => chromeView.webContents.send('tabs:active-changed', { id }),
      onNavigate: (entry) => historyStore.add(entry),
      onFocusAddressBar: () => {
        // A DOM-level input.focus() in chromeView's own script only works if
        // chromeView's webContents already holds native OS keyboard focus --
        // it doesn't automatically grab that focus away from whichever tab
        // was focused before (e.g. Cmd+T while typing on a page).
        chromeView.webContents.focus();
        chromeView.webContents.send('address-bar:focus');
      },
    });
    win.on('resize', () => tabManager.resizeActiveView());

    const unregister = registerWindow(chromeView.webContents.id, { win, chromeView, tabManager });
    win.on('closed', unregister);

    tabManager.createTab();
    return win;
  }

  createAppWindow();

  Menu.setApplicationMenu(
    buildAppMenu({
      openPreferences: createOrShowPreferencesWindow,
      createNewWindow: createAppWindow,
    })
  );

  // Clearing is async, so the app must not exit until it actually finishes --
  // otherwise "clear on quit" could silently no-op depending on timing.
  let clearedBeforeQuit = false;
  app.on('before-quit', (event) => {
    if (!settingsStore.get().clearDataOnQuit || clearedBeforeQuit) return;
    event.preventDefault();
    historyStore.clear();
    Promise.all([
      session.defaultSession.clearCache(),
      session.defaultSession.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers'] }),
    ]).finally(() => {
      clearedBeforeQuit = true;
      app.quit();
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createAppWindow();
  });
}).catch((err) => {
  // Without this, a thrown error here silently leaves the app running with
  // no window and no visible diagnostic.
  console.error('Failed to initialize app:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
