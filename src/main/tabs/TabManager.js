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

// Basic tab grouping: colors are assigned automatically, round-robin, from
// this small fixed palette rather than letting the user pick one -- keeps
// the feature genuinely "basic" (see ipc/tabContextMenuHandlers.js for the
// only UI: a right-click context menu on a tab).
const GROUP_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#64d2ff'];

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
    this.groups = new Map(); // groupId -> { id, name, color }
    this._nextGroupNumber = 1;
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
    const group = tab.groupId ? this.groups.get(tab.groupId) : null;
    return {
      id: tab.id,
      url: tab.state.url,
      title: tab.state.title,
      favicon: tab.state.favicon,
      isLoading: wc.isLoadingMainFrame(),
      canGoBack: nav ? nav.canGoBack() : wc.canGoBack(),
      canGoForward: nav ? nav.canGoForward() : wc.canGoForward(),
      isPrivate: tab.isPrivate,
      groupId: tab.groupId || null,
      groupName: group ? group.name : null,
      groupColor: group ? group.color : null,
      groupCollapsed: group ? !!group.collapsed : false,
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

  listGroups() {
    return Array.from(this.groups.values());
  }

  /** Creates a new group (auto-named/colored) containing just this one tab. */
  createGroupForTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    const id = crypto.randomUUID();
    const color = GROUP_COLORS[(this._nextGroupNumber - 1) % GROUP_COLORS.length];
    const name = `Group ${this._nextGroupNumber}`;
    this._nextGroupNumber += 1;
    this.groups.set(id, { id, name, color, collapsed: false });
    const oldGroupId = tab.groupId;
    tab.groupId = id;
    if (oldGroupId) this._pruneEmptyGroup(oldGroupId);
    this._emitUpdate();
  }

  addTabToGroup(tabId, groupId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !this.groups.has(groupId)) return;
    const oldGroupId = tab.groupId;
    tab.groupId = groupId;
    // Keep a group's tabs contiguous in the strip -- this is what lets the
    // group collapse into a single chip instead of needing to represent
    // scattered tabs.
    this._makeContiguousWithGroup(tabId, groupId);
    if (oldGroupId && oldGroupId !== groupId) this._pruneEmptyGroup(oldGroupId);
    this._emitUpdate();
  }

  /** Moves tabId to sit directly after the last other member of groupId (if any) in tab order. */
  _makeContiguousWithGroup(tabId, groupId) {
    const members = this.order.filter((id) => id !== tabId && this.tabs.get(id).groupId === groupId);
    if (members.length === 0) return;
    const lastMemberId = members[members.length - 1];
    this.order = this.order.filter((id) => id !== tabId);
    this.order.splice(this.order.indexOf(lastMemberId) + 1, 0, tabId);
  }

  removeTabFromGroup(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.groupId) return;
    const oldGroupId = tab.groupId;
    tab.groupId = null;
    this._pruneEmptyGroup(oldGroupId);
    this._emitUpdate();
  }

  /** A group with no tabs left in it is just clutter -- drop it silently. */
  _pruneEmptyGroup(groupId) {
    const stillUsed = Array.from(this.tabs.values()).some((t) => t.groupId === groupId);
    if (!stillUsed) this.groups.delete(groupId);
  }

  renameGroup(groupId, name) {
    const group = this.groups.get(groupId);
    const trimmed = (name || '').trim();
    if (!group || !trimmed) return;
    group.name = trimmed;
    this._emitUpdate();
  }

  /**
   * Collapses a group down to just its chip (member tabs hidden in the
   * renderer) or expands it back out. If the active tab is inside a group
   * being collapsed, switch to the nearest tab outside it first, so the
   * active tab never becomes an invisible pill the user can't click.
   */
  toggleGroupCollapsed(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    group.collapsed = !group.collapsed;
    if (group.collapsed) {
      const activeTab = this.tabs.get(this.activeId);
      if (activeTab && activeTab.groupId === groupId) {
        const idx = this.order.indexOf(this.activeId);
        const isOutside = (id) => this.tabs.get(id).groupId !== groupId;
        const after = this.order.slice(idx + 1).find(isOutside);
        const before = this.order
          .slice(0, idx)
          .reverse()
          .find(isOutside);
        const nextId = after || before;
        if (nextId) this.switchTab(nextId);
      }
    }
    this._emitUpdate();
  }

  /** Removes every tab from a group and deletes it, without closing any tabs. */
  ungroupAll(groupId) {
    if (!this.groups.has(groupId)) return;
    for (const tab of this.tabs.values()) {
      if (tab.groupId === groupId) tab.groupId = null;
    }
    this.groups.delete(groupId);
    this._emitUpdate();
  }

  /**
   * Moves `tabId` so it sits immediately before `beforeId` in tab-strip
   * order (or to the end, if `beforeId` is null/omitted). Used by the tab
   * bar's native drag-and-drop reordering.
   */
  moveTab(tabId, beforeId) {
    if (!this.tabs.has(tabId) || tabId === beforeId) return;
    this.order = this.order.filter((id) => id !== tabId);
    const insertAt = beforeId ? this.order.indexOf(beforeId) : -1;
    if (insertAt === -1) this.order.push(tabId);
    else this.order.splice(insertAt, 0, tabId);
    this._emitUpdate();
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
      groupId: null,
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
    const groupId = tab.groupId;

    tab.view.webContents.close();
    this.tabs.delete(id);
    this.order = this.order.filter((tid) => tid !== id);
    if (groupId) this._pruneEmptyGroup(groupId);

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
