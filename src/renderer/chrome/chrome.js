import { renderToolbar } from './components/toolbar.js';
import { renderAddressBar } from './components/addressBar.js';
import { renderTabBar } from './components/tabBar.js';
import { renderBookmarksBar } from './components/bookmarksBar.js';
import { renderSettingsPanel } from './components/settingsPanel.js';

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

function render() {
  renderTabBar(document.getElementById('tab-bar'), state, api, { onChange: refreshTabs });
  renderAddressBar(document.getElementById('address-bar'), state, api, { onBookmarkChange: refreshBookmarks });
  renderToolbar(document.getElementById('toolbar'), state, api);
  renderBookmarksBar(document.getElementById('bookmarks-bar'), state, api);
}

function applyTheme({ effective, custom }) {
  document.documentElement.dataset.theme = effective;
  if (custom && custom.colors) {
    for (const [key, value] of Object.entries(custom.colors)) {
      document.documentElement.style.setProperty(key, value);
    }
  }
}

function applyTabStyle() {
  document.documentElement.dataset.tabStyle = (state.settings && state.settings.tabStyle) || 'normal';
}

/**
 * The tab view's y-offset/height in the main process is derived from this
 * measurement, not a hardcoded constant, so any change here (button sizing,
 * compact tabs, bookmarks bar toggle) automatically keeps the page content
 * from ever overlapping the header.
 */
function reportHeaderHeight(chromeRoot) {
  const height = Math.ceil(chromeRoot.getBoundingClientRect().height);
  if (height > 0) api.invoke('ui:setHeaderHeight', { height });
}

async function init() {
  state.settings = await api.invoke('settings:get');
  await refreshTabs();
  await refreshBookmarks();
  if (state.tabs.length > 0) state.activeId = state.tabs[state.tabs.length - 1].id;

  applyTabStyle();
  applyTheme(await api.invoke('theme:get'));

  api.on('tabs:updated', (tabs) => {
    state.tabs = tabs;
    render();
  });
  api.on('tabs:active-changed', ({ id }) => {
    state.activeId = id;
    render();
  });
  api.on('theme:changed', applyTheme);

  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');

  const openSettingsPanel = () => {
    settingsPanel.classList.remove('hidden');
    api.invoke('ui:setOverlayOpen', { open: true });
    renderSettingsPanel(settingsPanel, state, api, {
      onSettingsChange: async () => {
        state.settings = await api.invoke('settings:get');
        applyTabStyle();
        render();
      },
    });
  };
  const closeSettingsPanel = () => {
    settingsPanel.classList.add('hidden');
    api.invoke('ui:setOverlayOpen', { open: false });
  };

  settingsToggle.addEventListener('click', () => {
    if (settingsPanel.classList.contains('hidden')) openSettingsPanel();
    else closeSettingsPanel();
  });
  document.addEventListener('click', (e) => {
    if (settingsPanel.classList.contains('hidden')) return;
    if (settingsPanel.contains(e.target) || settingsToggle.contains(e.target)) return;
    closeSettingsPanel();
  });

  render();

  const chromeRoot = document.getElementById('chrome-root');
  reportHeaderHeight(chromeRoot);
  new ResizeObserver(() => reportHeaderHeight(chromeRoot)).observe(chromeRoot);
}

init();
