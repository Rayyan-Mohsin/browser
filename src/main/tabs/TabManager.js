'use strict';

const crypto = require('crypto');
const path = require('path');
const { WebContentsView, nativeTheme } = require('electron');
const { HEADER_HEIGHT } = require('../../shared/layout');
const { normalizeInput } = require('./urlNormalize');

// A brand-new WebContentsView paints Chromium's opaque white default for a
// brief instant before the real page (or our own new-tab page, which uses
// these exact colors) has loaded and painted. In dark mode that shows as a
// jarring white flash; matching the eventual background up front removes it.
function themeBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff';
}

const NEW_TAB_BASE_URL = `file://${path.join(__dirname, '../../renderer/newtab/index.html')}`;
// Not prefixed with "persist:", so Electron keeps this session entirely in
// memory: no cookies/cache/storage for it ever touch disk, and it's gone
// once nothing references it (e.g. app quit). Shared by all private tabs so
// they behave like one private "session", isolated from the normal profile.
const PRIVATE_PARTITION = 'private-mode';

/** New-tab search box respects the user's configured engine via a query param (it has no IPC access). */
function buildNewTabUrl(searchEngineTemplate, isPrivate) {
  const params = new URLSearchParams({ engine: searchEngineTemplate });
  if (isPrivate) params.set('private', '1');
  return `${NEW_TAB_BASE_URL}?${params.toString()}`;
}

/** Manages one WebContentsView per tab, attaching only the active one below the chrome header. */
class TabManager {
  constructor(win, { getSearchEngine, onTabsUpdated, onActiveChanged, onNavigate, onFocusAddressBar }) {
    this.win = win;
    this.getSearchEngine = getSearchEngine;
    this.onTabsUpdated = onTabsUpdated || (() => {});
    this.onActiveChanged = onActiveChanged || (() => {});
    this.onNavigate = onNavigate || (() => {});
    this.onFocusAddressBar = onFocusAddressBar || (() => {});
    this.tabs = new Map();
    this.order = [];
    this.activeId = null;
    // Fallback used only until the chrome renderer reports its real
    // measured height (its content size can vary with font size, zoom, or
    // the tab bar layout setting, so a hardcoded constant can't be kept
    // reliably in sync).
    this.headerHeight = HEADER_HEIGHT;
    this.overlayOpen = false;
    // Id of the tab currently in HTML5 (in-page) fullscreen, e.g. a video
    // player -- null when no tab is fullscreen.
    this.fullscreenTabId = null;

    // Safety net: if native fullscreen ends by some path other than the
    // page's own exit-fullscreen action (e.g. the user used the OS-level
    // fullscreen toggle), make sure our bounds/state don't stay stuck.
    win.on('leave-full-screen', () => {
      if (this.fullscreenTabId) {
        this.fullscreenTabId = null;
        this.resizeActiveView();
      }
    });
  }

  list() {
    return this.order.map((id) => this._publicState(this.tabs.get(id)));
  }

  _publicState(tab) {
    const wc = tab.view.webContents;
    const nav = wc.navigationHistory;
    return {
      id: tab.id,
      url: tab.state.url,
      title: tab.state.title,
      favicon: tab.state.favicon,
      isLoading: wc.isLoadingMainFrame(),
      canGoBack: nav ? nav.canGoBack() : wc.canGoBack(),
      canGoForward: nav ? nav.canGoForward() : wc.canGoForward(),
      isPrivate: tab.isPrivate,
    };
  }

  _emitUpdate() {
    this.onTabsUpdated(this.list());
  }

  /** Whether the currently active tab is a private one — used so "+"/Cmd+T stays in private mode. */
  isActiveTabPrivate() {
    const tab = this.tabs.get(this.activeId);
    return !!(tab && tab.isPrivate);
  }

  createTab(url, options = {}) {
    const isPrivate = !!options.private;
    const isBlank = !url;
    const id = crypto.randomUUID();
    const webPreferences = {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    };
    if (isPrivate) webPreferences.partition = PRIVATE_PARTITION;
    const view = new WebContentsView({ backgroundColor: themeBackgroundColor(), webPreferences });
    if (typeof view.setBackgroundColor === 'function') {
      view.setBackgroundColor(themeBackgroundColor());
    }
    const tab = {
      id,
      view,
      isPrivate,
      state: {
        url: url || buildNewTabUrl(this.getSearchEngine(), isPrivate),
        title: 'New Tab',
        favicon: null,
      },
    };
    this.tabs.set(id, tab);
    this.order.push(id);

    const wc = view.webContents;
    wc.on('page-title-updated', (_e, title) => {
      tab.state.title = title;
      this._emitUpdate();
    });
    wc.on('page-favicon-updated', (_e, favicons) => {
      tab.state.favicon = favicons[0] || null;
      this._emitUpdate();
    });
    wc.on('did-navigate', (_e, navUrl) => {
      tab.state.url = navUrl;
      this._emitUpdate();
      // Exclude our own local pages and private tabs from history.
      if (!navUrl.startsWith('file://') && !tab.isPrivate) {
        this.onNavigate({ url: navUrl, title: tab.state.title, favicon: tab.state.favicon });
      }
    });
    wc.on('did-navigate-in-page', (_e, navUrl) => {
      tab.state.url = navUrl;
      this._emitUpdate();
    });
    wc.on('did-start-loading', () => this._emitUpdate());
    wc.on('did-stop-loading', () => this._emitUpdate());

    // In-page (HTML5) fullscreen, e.g. a video player's fullscreen button —
    // distinct from the app's own window-fullscreen toggle. Hide the header
    // entirely and let the tab's content cover the whole window, matching
    // Safari's behavior.
    wc.on('enter-html-full-screen', () => {
      if (this.activeId !== id) return;
      this.fullscreenTabId = id;
      this.win.setFullScreen(true);
      this.resizeActiveView();
    });
    wc.on('leave-html-full-screen', () => {
      if (this.fullscreenTabId !== id) return;
      this.fullscreenTabId = null;
      this.win.setFullScreen(false);
      this.resizeActiveView();
    });

    wc.loadURL(tab.state.url);

    this.switchTab(id);
    this._emitUpdate();
    // A brand-new blank tab should be ready for the user to type a URL
    // immediately, matching Safari/Chrome, rather than leaving focus in
    // the new-tab page's own search box.
    if (isBlank) this.onFocusAddressBar();
    return this._publicState(tab);
  }

  switchTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (this.activeId && this.activeId !== id) {
      const prev = this.tabs.get(this.activeId);
      if (prev) this.win.contentView.removeChildView(prev.view);
    }
    this.activeId = id;
    if (!this.overlayOpen) this.win.contentView.addChildView(tab.view);
    this.resizeActiveView();
    this.onActiveChanged(id);
    this._emitUpdate();
  }

  closeTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const wasActive = this.activeId === id;
    if (wasActive) this.win.contentView.removeChildView(tab.view);
    if (this.fullscreenTabId === id) {
      this.fullscreenTabId = null;
      this.win.setFullScreen(false);
    }

    tab.view.webContents.close();
    this.tabs.delete(id);
    this.order = this.order.filter((tid) => tid !== id);

    if (!wasActive) {
      this._emitUpdate();
      return;
    }

    const nextId = this.order[this.order.length - 1];
    if (nextId) {
      this.switchTab(nextId);
    } else {
      this.activeId = null;
      this.createTab(); // never leave the browser with zero tabs
    }
  }

  navigate(id, input) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const target = normalizeInput(input, this.getSearchEngine());
    tab.view.webContents.loadURL(target);
  }

  reload(id) {
    this.tabs.get(id)?.view.webContents.reload();
  }

  stop(id) {
    this.tabs.get(id)?.view.webContents.stop();
  }

  goBack(id) {
    const wc = this.tabs.get(id)?.view.webContents;
    if (!wc) return;
    if (wc.navigationHistory) wc.navigationHistory.goBack();
    else wc.goBack();
  }

  goForward(id) {
    const wc = this.tabs.get(id)?.view.webContents;
    if (!wc) return;
    if (wc.navigationHistory) wc.navigationHistory.goForward();
    else wc.goForward();
  }

  resizeActiveView() {
    if (!this.activeId) return;
    const tab = this.tabs.get(this.activeId);
    if (!tab) return;
    const [width, height] = this.win.getContentSize();
    const isFullscreen = this.fullscreenTabId === this.activeId;
    tab.view.setBounds({
      x: 0,
      y: isFullscreen ? 0 : this.headerHeight,
      width,
      height: isFullscreen ? height : Math.max(0, height - this.headerHeight),
    });
  }

  /** Called by the chrome renderer once it measures its own real rendered height. */
  setHeaderHeight(height) {
    if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return;
    this.headerHeight = height;
    this.resizeActiveView();
  }

  /**
   * While a chrome-view overlay (e.g. the settings panel) is open, detach the
   * active tab's view entirely so it can never cover a popover that extends
   * below the header's own bounds.
   */
  setOverlayOpen(open) {
    this.overlayOpen = !!open;
    if (!this.activeId) return;
    const tab = this.tabs.get(this.activeId);
    if (!tab) return;
    if (this.overlayOpen) {
      this.win.contentView.removeChildView(tab.view);
    } else {
      this.win.contentView.addChildView(tab.view);
      this.resizeActiveView();
    }
  }
}

module.exports = { TabManager, buildNewTabUrl };
