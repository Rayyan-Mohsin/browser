import { renderToolbar } from './components/toolbar.js';
import { renderAddressBar } from './components/addressBar.js';
import { renderTabBar } from './components/tabBar.js';
import { renderCompactToolbar, renderCompactTabStrip } from './components/compactBar.js';
import { renderBookmarksBar } from './components/bookmarksBar.js';
import { renderSettingsPanel } from './components/settingsPanel.js';
import { initTooltips } from './components/tooltip.js';

const api = window.browserAPI;

const state = {
  tabs: [],
  activeId: null,
  bookmarks: { folders: [], bookmarks: [] },
  settings: null,
};

async function refreshTabs() {
  state.tabs = await api.invoke('tabs:list');
  render();
}

async function refreshBookmarks() {
  state.bookmarks = await api.invoke('bookmarks:list');
  render();
}

async function shareTab(tab) {
  const result = await api.invoke('page:share', { url: tab.url, title: tab.title || tab.url });
  if (result && result.error) {
    alert(`Couldn't open the share menu: ${result.error}`);
  }
}

function isNewTabUrl(url) {
  return !!url && url.startsWith('file://') && url.includes('/renderer/newtab/');
}

function isCompactLayout() {
  return ((state.settings && state.settings.tabBarLayout) || 'separate') === 'compact';
}

function render() {
  if (isCompactLayout()) {
    renderCompactToolbar(document.getElementById('compact-toolbar'), state, api);
    renderCompactTabStrip(document.getElementById('compact-tab-strip'), state, api, {
      onChange: refreshTabs,
      onBookmarkChange: refreshBookmarks,
      onShare: shareTab,
    });
  } else {
    renderTabBar(document.getElementById('tab-bar'), state, api, { onChange: refreshTabs });
    renderAddressBar(document.getElementById('address-bar'), state, api, {
      onBookmarkChange: refreshBookmarks,
      onShare: shareTab,
    });
    renderToolbar(document.getElementById('toolbar'), state, api);
  }
  renderBookmarksBar(document.getElementById('bookmarks-bar'), state, api);
  updateLoadingBar();
}

function updateLoadingBar() {
  const tab = state.tabs.find((t) => t.id === state.activeId);
  document.getElementById('loading-bar').classList.toggle('active', !!tab && tab.isLoading);
}

/** Focuses (and selects) whichever address field is currently rendered, matching the active layout. */
function focusAddressField() {
  const input = isCompactLayout()
    ? document.querySelector('.compact-pill.active input')
    : document.querySelector('#address-bar input');
  if (input) {
    input.focus();
    input.select();
  }
}

function applyTheme({ effective, custom }) {
  document.documentElement.dataset.theme = effective;
  if (custom && custom.colors) {
    for (const [key, value] of Object.entries(custom.colors)) {
      document.documentElement.style.setProperty(key, value);
    }
  }
}

function applyTabBarLayout() {
  document.documentElement.dataset.tabBarLayout = (state.settings && state.settings.tabBarLayout) || 'separate';
}

/**
 * The tab view's y-offset/height in the main process is derived from this
 * measurement, not a hardcoded constant, so any change here (button sizing,
 * tab bar layout, bookmarks bar toggle) automatically keeps the page content
 * from ever overlapping the header.
 */
function reportHeaderHeight(chromeRoot) {
  const height = Math.ceil(chromeRoot.getBoundingClientRect().height);
  if (height > 0) api.invoke('ui:setHeaderHeight', { height });
}

async function init() {
  // Register broadcast listeners FIRST, before any awaited IPC round-trip
  // below. The main process creates the first tab (and its loading-state
  // events) concurrently with this script's own startup calls, so if we
  // subscribed only after those awaits, an early tabs:updated/active-changed
  // broadcast could arrive and be silently dropped — leaving stale state
  // (e.g. a permanently-stuck loading bar) until some later, unrelated
  // event happened to trigger a fresh render.
  api.on('tabs:updated', (tabs) => {
    state.tabs = tabs;
    render();
  });
  api.on('tabs:active-changed', ({ id }) => {
    state.activeId = id;
    render();
  });
  api.on('theme:changed', applyTheme);
  api.on('address-bar:focus', focusAddressField);
  api.on('group:promptRename', ({ groupId, name }) => {
    const next = window.prompt('Rename group', name || '');
    if (next !== null && next.trim()) api.invoke('groups:rename', { groupId, name: next.trim() });
  });

  state.settings = await api.invoke('settings:get');
  await refreshTabs();
  await refreshBookmarks();
  // Only a fallback: a live tabs:active-changed event above may already have
  // set this by the time these awaits resolve, and must not be clobbered.
  if (!state.activeId && state.tabs.length > 0) state.activeId = state.tabs[state.tabs.length - 1].id;

  applyTabBarLayout();
  applyTheme(await api.invoke('theme:get'));

  const settingsToggles = document.querySelectorAll('.settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');

  const openSettingsPanel = () => {
    settingsPanel.classList.add('open');
    api.invoke('ui:setOverlayOpen', { open: true });
    renderSettingsPanel(settingsPanel, state, api, {
      onSettingsChange: async () => {
        state.settings = await api.invoke('settings:get');
        applyTabBarLayout();
        render();
      },
    });
  };
  const closeSettingsPanel = () => {
    settingsPanel.classList.remove('open');
    api.invoke('ui:setOverlayOpen', { open: false });
  };

  settingsToggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (settingsPanel.classList.contains('open')) closeSettingsPanel();
      else openSettingsPanel();
    });
  });
  document.addEventListener('click', (e) => {
    if (!settingsPanel.classList.contains('open')) return;
    if (settingsPanel.contains(e.target)) return;
    if ([...settingsToggles].some((btn) => btn.contains(e.target))) return;
    closeSettingsPanel();
  });

  render();
  initTooltips(document.body);

  const chromeRoot = document.getElementById('chrome-root');
  reportHeaderHeight(chromeRoot);
  new ResizeObserver(() => reportHeaderHeight(chromeRoot)).observe(chromeRoot);

  // Cold launch typically starts on a single blank tab. Focus it directly
  // here rather than relying solely on the main process's address-bar:focus
  // push (sent from TabManager.createTab) — that event fires while this
  // script is still starting up and could arrive before the listener above
  // is registered.
  const activeTab = state.tabs.find((t) => t.id === state.activeId);
  if (activeTab && isNewTabUrl(activeTab.url)) focusAddressField();
}

init();
