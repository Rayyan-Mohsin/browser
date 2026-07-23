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

/**
 * The chrome view spans the *entire* window, but the active tab's own
 * native view is layered on top of it for everything below the header --
 * so any chrome-view overlay that isn't confined to the header (the
 * settings panel, this text-prompt modal) is invisible unless the active
 * tab's view is detached first. Reference-counted so the settings panel and
 * the modal can't stomp on each other if one is somehow triggered while the
 * other is already open.
 */
let overlayOpenCount = 0;
function pushOverlayOpen() {
  overlayOpenCount += 1;
  if (overlayOpenCount === 1) api.invoke('ui:setOverlayOpen', { open: true });
}
function popOverlayOpen() {
  overlayOpenCount = Math.max(0, overlayOpenCount - 1);
  if (overlayOpenCount === 0) api.invoke('ui:setOverlayOpen', { open: false });
}

/**
 * Electron doesn't implement window.prompt() (unlike alert()/confirm(),
 * which it does show as native dialogs) -- calling it silently no-ops. This
 * is the app's own equivalent, backed by the hidden #text-prompt-modal in
 * index.html. Resolves to the entered text, or null if cancelled.
 */
function promptText(title, defaultValue) {
  const overlay = document.getElementById('text-prompt-modal');
  const titleEl = overlay.querySelector('.modal-title');
  const input = overlay.querySelector('.modal-input');
  const okBtn = overlay.querySelector('.modal-ok');
  const cancelBtn = overlay.querySelector('.modal-cancel');

  titleEl.textContent = title;
  input.value = defaultValue || '';
  overlay.classList.remove('hidden');
  pushOverlayOpen();
  input.focus();
  input.select();

  return new Promise((resolve) => {
    const cleanup = (result) => {
      overlay.classList.add('hidden');
      popOverlayOpen();
      input.onkeydown = null;
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      overlay.onclick = null;
      resolve(result);
    };
    okBtn.onclick = () => cleanup(input.value);
    cancelBtn.onclick = () => cleanup(null);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') cleanup(input.value);
      else if (e.key === 'Escape') cleanup(null);
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) cleanup(null);
    };
  });
}

function isCompactLayout() {
  return ((state.settings && state.settings.tabBarLayout) || 'separate') === 'compact';
}

function render() {
  if (isCompactLayout()) {
    renderCompactToolbar(document.getElementById('compact-toolbar'), state, api);
    renderCompactTabStrip(document.getElementById('compact-tab-track'), state, api, {
      onChange: refreshTabs,
      onBookmarkChange: refreshBookmarks,
      onShare: shareTab,
    });
  } else {
    renderTabBar(document.getElementById('tab-bar-track'), state, api, { onChange: refreshTabs });
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
  api.on('group:promptRename', async ({ groupId, name }) => {
    const next = await promptText('Rename Group', name || '');
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
    pushOverlayOpen();
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
    popOverlayOpen();
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

  // Static "+" buttons: kept out of tabBar.js/compactBar.js's render loop
  // entirely (they live in index.html, not in the scrollable/shrinkable
  // pill track) so their position never shifts as tabs are added or shrink.
  const createNewTab = async () => {
    await api.invoke('tabs:create', {});
    await refreshTabs();
  };
  document.getElementById('tab-add-btn').addEventListener('click', createNewTab);
  document.getElementById('compact-add-btn').addEventListener('click', createNewTab);

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
