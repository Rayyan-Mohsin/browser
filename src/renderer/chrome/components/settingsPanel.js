const SEARCH_ENGINE_OPTIONS = [
  { id: 'google', label: 'Google' },
  { id: 'bing', label: 'Bing' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'custom', label: 'Custom' },
];

const SHORTCUTS = [
  ['New Tab', '⌘T'],
  ['New Private Tab', '⌘⇧N'],
  ['Close Tab', '⌘W'],
  ['Reload', '⌘R'],
  ['Zoom In', '⌘+'],
  ['Zoom Out', '⌘-'],
  ['Reset Zoom', '⌘0'],
  ['Full Screen', '⌃⌘F'],
  ['Advanced Settings', '⌘,'],
  ['Quit', '⌘Q'],
];

function heading(text) {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}

function section(title) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-section';
  wrap.appendChild(heading(title));
  return wrap;
}

/** A row of pill buttons acting as one exclusive choice — replaces native radio inputs. */
function segmented({ options, current, onChange }) {
  const group = document.createElement('div');
  group.className = 'segmented';
  const buttons = [];
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opt.label;
    btn.classList.toggle('selected', opt.value === current);
    btn.setAttribute('aria-pressed', String(opt.value === current));
    if (opt.tooltip) btn.dataset.tooltip = opt.tooltip;
    btn.addEventListener('click', () => {
      // Move the selection immediately: unlike a native radio input, a plain
      // button doesn't reflect "selected" on its own, and the settings
      // panel isn't guaranteed to re-render after onChange resolves.
      buttons.forEach((b, i) => {
        const isSelected = options[i].value === opt.value;
        b.classList.toggle('selected', isSelected);
        b.setAttribute('aria-pressed', String(isSelected));
      });
      onChange(opt.value);
    });
    buttons.push(btn);
    group.appendChild(btn);
  }
  return group;
}

/** A macOS-style pill toggle — replaces native checkbox inputs. */
function toggleSwitch({ checked, onChange }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'switch' + (checked ? ' on' : '');
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(checked));
  btn.addEventListener('click', () => {
    const next = !btn.classList.contains('on');
    btn.classList.toggle('on', next);
    btn.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return btn;
}

function switchRow(label, tooltip, checked, onChange) {
  const row = document.createElement('div');
  row.className = 'row';
  if (tooltip) row.dataset.tooltip = tooltip;
  const span = document.createElement('span');
  span.textContent = label;
  row.appendChild(span);
  row.appendChild(toggleSwitch({ checked, onChange }));
  return row;
}

function actionButton(label, onClick, { danger = false, tooltip } = {}) {
  const btn = document.createElement('button');
  btn.className = 'settings-btn' + (danger ? ' danger' : '');
  btn.textContent = label;
  if (tooltip) btn.dataset.tooltip = tooltip;
  btn.addEventListener('click', onClick);
  return btn;
}

function emptyRow(text) {
  const row = document.createElement('div');
  row.className = 'row';
  row.textContent = text;
  return row;
}

export function renderSettingsPanel(el, state, api, { onSettingsChange }) {
  el.innerHTML = '';
  const settings = state.settings || {};
  const theme = settings.theme || { mode: 'system' };

  // Appearance
  const appearance = section('Appearance');
  appearance.appendChild(
    segmented({
      options: [
        { value: 'light', label: 'Light', tooltip: 'Always use the light appearance.' },
        { value: 'dark', label: 'Dark', tooltip: 'Always use the dark appearance.' },
        { value: 'system', label: 'System', tooltip: 'Match your Mac’s appearance and switch automatically.' },
      ],
      current: theme.mode,
      onChange: async (mode) => {
        await api.invoke('theme:set', { mode });
        onSettingsChange();
      },
    })
  );
  el.appendChild(appearance);

  // Tab bar layout
  const tabBar = section('Tab Bar');
  tabBar.appendChild(
    segmented({
      options: [
        { value: 'separate', label: 'Separate', tooltip: 'Tabs and the address bar are shown in two rows (default).' },
        {
          value: 'compact',
          label: 'Compact',
          tooltip: 'Tabs and the address bar merge into one row, Safari-style — the active tab becomes the address field.',
        },
      ],
      current: settings.tabBarLayout || 'separate',
      onChange: async (layout) => {
        await api.invoke('settings:set', { tabBarLayout: layout });
        onSettingsChange();
      },
    })
  );
  el.appendChild(tabBar);

  // Search engine
  const searchEngine = section('Search Engine');
  searchEngine.appendChild(buildSearchEngineSection(settings, api, onSettingsChange));
  el.appendChild(searchEngine);

  // Bookmarks
  const bookmarks = section('Bookmarks');
  bookmarks.appendChild(
    switchRow(
      'Show bookmarks bar',
      'Show a row of your top-level bookmarks below the tab bar.',
      !!settings.showBookmarksBar,
      async (checked) => {
        await api.invoke('settings:set', { showBookmarksBar: checked });
        onSettingsChange();
      }
    )
  );
  el.appendChild(bookmarks);

  // History
  const history = section('History');
  history.appendChild(buildHistorySection(state, api, () => renderSettingsPanel(el, state, api, { onSettingsChange })));
  el.appendChild(history);

  // Downloads
  const downloads = section('Downloads');
  downloads.appendChild(buildDownloadsSection(api));
  el.appendChild(downloads);

  // Privacy
  const privacy = section('Privacy');
  privacy.appendChild(buildPrivacySection(api, () => renderSettingsPanel(el, state, api, { onSettingsChange })));
  el.appendChild(privacy);

  // Extensions
  const extensions = section('Extensions');
  const extList = document.createElement('div');
  extensions.appendChild(extList);
  refreshExtensionList(extList, api, () => renderSettingsPanel(el, state, api, { onSettingsChange }));
  extensions.appendChild(
    actionButton(
      'Load Unpacked Extension…',
      async () => {
        const dir = await api.invoke('extensions:openLoadDialog');
        if (!dir) return;
        const result = await api.invoke('extensions:load', { path: dir });
        if (result && result.error) alert(`Failed to load extension: ${result.error}`);
        renderSettingsPanel(el, state, api, { onSettingsChange });
      },
      { tooltip: 'Pick a folder containing a manifest.json to load it as a browser extension.' }
    )
  );
  el.appendChild(extensions);

  // Keyboard shortcuts
  const shortcuts = section('Keyboard Shortcuts');
  shortcuts.appendChild(buildShortcutsSection());
  el.appendChild(shortcuts);
}

function buildSearchEngineSection(settings, api, onSettingsChange) {
  const wrap = document.createElement('div');
  const currentId = settings.searchEngineId || 'google';

  const customInput = document.createElement('input');
  customInput.className = 'text-input';
  customInput.type = 'text';
  customInput.placeholder = 'https://example.com/search?q=%s';
  customInput.value = settings.customSearchEngine || '';
  customInput.dataset.tooltip = 'Must contain %s where the search query should be inserted.';
  if (currentId !== 'custom') customInput.classList.add('hidden');
  customInput.addEventListener('change', async () => {
    const result = await api.invoke('settings:setSearchEngine', {
      id: 'custom',
      customTemplate: customInput.value,
    });
    if (result && result.error) {
      customInput.classList.add('invalid');
    } else {
      customInput.classList.remove('invalid');
      onSettingsChange();
    }
  });

  wrap.appendChild(
    segmented({
      options: SEARCH_ENGINE_OPTIONS.map(({ id, label }) => ({
        value: id,
        label,
        tooltip: id === 'custom' ? 'Use your own search engine by supplying a URL template.' : `Use ${label} for address bar searches.`,
      })),
      current: currentId,
      onChange: async (id) => {
        if (id !== 'custom') {
          const result = await api.invoke('settings:setSearchEngine', { id });
          if (result && result.error) alert(result.error);
          onSettingsChange();
        } else {
          customInput.classList.remove('hidden');
          customInput.focus();
        }
      },
    })
  );
  wrap.appendChild(customInput);

  return wrap;
}

function buildPrivacySection(api, onCleared) {
  const wrap = document.createElement('div');

  const checkboxState = { history: false, cache: false, cookies: false };
  const options = [
    { key: 'history', label: 'Browsing history', tooltip: 'Deletes your saved browsing history.' },
    { key: 'cache', label: 'Cached files', tooltip: 'Frees up space; some pages may load slower next time.' },
    { key: 'cookies', label: 'Cookies & site data', tooltip: 'Signs you out of most sites.' },
  ];
  for (const opt of options) {
    wrap.appendChild(
      switchRow(opt.label, opt.tooltip, false, (checked) => {
        checkboxState[opt.key] = checked;
      })
    );
  }

  wrap.appendChild(
    actionButton(
      'Clear Browsing Data',
      async () => {
        if (!checkboxState.history && !checkboxState.cache && !checkboxState.cookies) return;
        await api.invoke('privacy:clearData', { ...checkboxState });
        onCleared();
      },
      { danger: true, tooltip: 'Permanently deletes the selected data. This cannot be undone.' }
    )
  );

  return wrap;
}

function buildHistorySection(state, api, onCleared) {
  const wrap = document.createElement('div');
  const list = document.createElement('div');
  list.className = 'scroll-list';
  wrap.appendChild(list);

  api.invoke('history:list').then((entries) => {
    list.innerHTML = '';
    if (entries.length === 0) {
      list.appendChild(emptyRow('No history yet'));
      return;
    }
    for (const entry of entries.slice(0, 50)) {
      const row = document.createElement('div');
      row.className = 'row';
      const title = document.createElement('span');
      title.className = 'entry-title';
      title.textContent = entry.title || entry.url;
      title.title = entry.url;
      title.dataset.tooltip = new Date(entry.visitedAt).toLocaleString();
      title.addEventListener('click', () => {
        if (state.activeId) api.invoke('tabs:navigate', { id: state.activeId, input: entry.url });
      });
      row.appendChild(title);
      list.appendChild(row);
    }
  });

  wrap.appendChild(
    actionButton(
      'Clear History',
      async () => {
        await api.invoke('history:clear');
        onCleared();
      },
      { danger: true, tooltip: 'Deletes all saved browsing history.' }
    )
  );

  return wrap;
}

function buildDownloadsSection(api) {
  const wrap = document.createElement('div');
  const list = document.createElement('div');
  list.className = 'scroll-list';
  wrap.appendChild(list);

  api.invoke('downloads:list').then((entries) => {
    list.innerHTML = '';
    if (entries.length === 0) {
      list.appendChild(emptyRow('No downloads yet'));
      return;
    }
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'row';
      const title = document.createElement('span');
      title.className = 'entry-title';
      title.textContent = entry.filename;
      title.dataset.tooltip = entry.state === 'completed' ? 'Completed' : entry.state;
      row.appendChild(title);

      const openBtn = document.createElement('button');
      openBtn.className = 'icon-btn';
      openBtn.textContent = '↗';
      openBtn.dataset.tooltip = 'Open file';
      openBtn.addEventListener('click', () => api.invoke('downloads:openFile', { id: entry.id }));
      row.appendChild(openBtn);

      const revealBtn = document.createElement('button');
      revealBtn.className = 'icon-btn';
      revealBtn.textContent = '⌕';
      revealBtn.dataset.tooltip = 'Show in Finder';
      revealBtn.addEventListener('click', () => api.invoke('downloads:showInFolder', { id: entry.id }));
      row.appendChild(revealBtn);

      list.appendChild(row);
    }
  });

  return wrap;
}

function buildShortcutsSection() {
  const wrap = document.createElement('div');
  wrap.className = 'shortcuts-list';
  for (const [label, keys] of SHORTCUTS) {
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.textContent = label;
    const kbd = document.createElement('kbd');
    kbd.textContent = keys;
    row.appendChild(name);
    row.appendChild(kbd);
    wrap.appendChild(row);
  }
  return wrap;
}

async function refreshExtensionList(extList, api, onRemoved) {
  const extensions = await api.invoke('extensions:list');
  extList.innerHTML = '';
  if (extensions.length === 0) {
    extList.appendChild(emptyRow('No extensions loaded'));
    return;
  }
  for (const ext of extensions) {
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.textContent = `${ext.name} (${ext.version})`;
    const remove = document.createElement('button');
    remove.className = 'icon-btn';
    remove.textContent = '✕';
    remove.dataset.tooltip = 'Remove extension';
    remove.addEventListener('click', async () => {
      await api.invoke('extensions:remove', { id: ext.id });
      onRemoved();
    });
    row.appendChild(name);
    row.appendChild(remove);
    extList.appendChild(row);
  }
}
