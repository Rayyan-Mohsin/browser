'use strict';

const crypto = require('crypto');
const path = require('path');
const { WebContentsView } = require('electron');
const { HEADER_HEIGHT } = require('../../shared/layout');
const { normalizeInput } = require('./urlNormalize');

const NEW_TAB_URL = `file://${path.join(__dirname, '../../renderer/newtab/index.html')}`;

/** Manages one WebContentsView per tab, attaching only the active one below the chrome header. */
class TabManager {
  constructor(win, { getSearchEngine, onTabsUpdated, onActiveChanged }) {
    this.win = win;
    this.getSearchEngine = getSearchEngine;
    this.onTabsUpdated = onTabsUpdated || (() => {});
    this.onActiveChanged = onActiveChanged || (() => {});
    this.tabs = new Map();
    this.order = [];
    this.activeId = null;
    // Fallback used only until the chrome renderer reports its real
    // measured height (its content size can vary with font/zoom/tab-style
    // settings, so a hardcoded constant can't be kept reliably in sync).
    this.headerHeight = HEADER_HEIGHT;
    this.overlayOpen = false;
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
    };
  }

  _emitUpdate() {
    this.onTabsUpdated(this.list());
  }

  createTab(url) {
    const id = crypto.randomUUID();
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    const tab = {
      id,
      view,
      state: { url: url || NEW_TAB_URL, title: 'New Tab', favicon: null },
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
    });
    wc.on('did-navigate-in-page', (_e, navUrl) => {
      tab.state.url = navUrl;
      this._emitUpdate();
    });
    wc.on('did-start-loading', () => this._emitUpdate());
    wc.on('did-stop-loading', () => this._emitUpdate());

    wc.loadURL(tab.state.url);

    this.switchTab(id);
    this._emitUpdate();
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
    tab.view.setBounds({
      x: 0,
      y: this.headerHeight,
      width,
      height: Math.max(0, height - this.headerHeight),
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

module.exports = { TabManager, NEW_TAB_URL };
