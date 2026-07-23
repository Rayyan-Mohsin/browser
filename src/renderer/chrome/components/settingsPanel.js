const SEARCH_ENGINE_OPTIONS = [
  { id: 'google', label: 'Google' },
  { id: 'bing', label: 'Bing' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'custom', label: 'Custom' },
];

const SHORTCUTS = [
  ['New Tab', '⌘T'],
  ['Close Tab', '⌘W'],
  ['Reload', '⌘R'],
  ['Zoom In', '⌘+'],
  ['Zoom Out', '⌘-'],
  ['Reset Zoom', '⌘0'],
  ['Full Screen', '⌃⌘F'],
  ['Quit', '⌘Q'],
];

export function renderSettingsPanel(el, state, api, { onSettingsChange }) {
  el.innerHTML = '';
  const settings = state.settings || {};
  const theme = settings.theme || { mode: 'system' };

  el.appendChild(heading('Appearance'));
  const modeRow = document.createElement('div');
  modeRow.className = 'row';
  const themeDescriptions = {
    light: 'Always use the light appearance.',
    dark: 'Always use the dark appearance.',
    system: 'Match your Mac’s current appearance and switch automatically.',
  };
  for (const mode of ['light', 'dark', 'system']) {
    const label = document.createElement('label');
    label.dataset.tooltip = themeDescriptions[mode];
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'theme-mode';
    radio.value = mode;
    radio.checked = theme.mode === mode;
    radio.addEventListener('change', async () => {
      await api.invoke('theme:set', { mode });
      onSettingsChange();
    });
    label.appendChild(radio);
    label.append(` ${mode[0].toUpperCase()}${mode.slice(1)}`);
    modeRow.appendChild(label);
  }
  el.appendChild(modeRow);

  el.appendChild(divider());
  el.appendChild(heading('Tab Bar'));
  const layoutRow = document.createElement('div');
  layoutRow.className = 'row';
  const layoutDescriptions = {
    separate: 'Tabs and the address bar are shown in two separate rows (default).',
    compact: 'Tabs and the address bar merge into one row, Safari-style — the active tab becomes the address field.',
  };
  for (const layout of ['separate', 'compact']) {
    const label = document.createElement('label');
    label.dataset.tooltip = layoutDescriptions[layout];
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'tab-bar-layout';
    radio.value = layout;
    radio.checked = (settings.tabBarLayout || 'separate') === layout;
    radio.addEventListener('change', async () => {
      await api.invoke('settings:set', { tabBarLayout: layout });
      onSettingsChange();
    });
    label.appendChild(radio);
    label.append(` ${layout[0].toUpperCase()}${layout.slice(1)}`);
    layoutRow.appendChild(label);
  }
  el.appendChild(layoutRow);

  el.appendChild(divider());
  el.appendChild(heading('Search Engine'));
  el.appendChild(buildSearchEngineSection(settings, api, onSettingsChange));

  el.appendChild(divider());
  el.appendChild(heading('Bookmarks'));
  const bmRow = document.createElement('div');
  bmRow.className = 'row';
  const bmLabel = document.createElement('label');
  bmLabel.dataset.tooltip = 'Show a row of your top-level bookmarks below the tab bar.';
  const bmToggle = document.createElement('input');
  bmToggle.type = 'checkbox';
  bmToggle.checked = !!settings.showBookmarksBar;
  bmToggle.addEventListener('change', async () => {
    await api.invoke('settings:set', { showBookmarksBar: bmToggle.checked });
    onSettingsChange();
  });
  bmLabel.appendChild(bmToggle);
  bmLabel.append(' Show bookmarks bar');
  bmRow.appendChild(bmLabel);
  el.appendChild(bmRow);

  el.appendChild(divider());
  el.appendChild(heading('History'));
  el.appendChild(buildHistorySection(state, api, () => renderSettingsPanel(el, state, api, { onSettingsChange })));

  el.appendChild(divider());
  el.appendChild(heading('Downloads'));
  el.appendChild(buildDownloadsSection(api));

  el.appendChild(divider());
  el.appendChild(heading('Privacy'));
  el.appendChild(buildPrivacySection(api, () => renderSettingsPanel(el, state, api, { onSettingsChange })));

  el.appendChild(divider());
  el.appendChild(heading('Extensions'));
  const extList = document.createElement('div');
  el.appendChild(extList);
  refreshExtensionList(extList, api, () => renderSettingsPanel(el, state, api, { onSettingsChange }));

  const loadBtn = document.createElement('button');
  loadBtn.className = 'icon-btn';
  loadBtn.style.width = '100%';
  loadBtn.textContent = 'Load Unpacked Extension…';
  loadBtn.dataset.tooltip = 'Pick a folder containing a manifest.json to load it as a browser extension.';
  loadBtn.addEventListener('click', async () => {
    const dir = await api.invoke('extensions:openLoadDialog');
    if (!dir) return;
    const result = await api.invoke('extensions:load', { path: dir });
    if (result && result.error) {
      alert(`Failed to load extension: ${result.error}`);
    }
    renderSettingsPanel(el, state, api, { onSettingsChange });
  });
  el.appendChild(loadBtn);

  el.appendChild(divider());
  el.appendChild(heading('Keyboard Shortcuts'));
  el.appendChild(buildShortcutsSection());
}

function heading(text) {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}

function divider() {
  const d = document.createElement('div');
  d.className = 'divider';
  return d;
}

function buildSearchEngineSection(settings, api, onSettingsChange) {
  const wrap = document.createElement('div');
  const currentId = settings.searchEngineId || 'google';

  const row = document.createElement('div');
  row.className = 'row';
  row.style.flexWrap = 'wrap';
  for (const { id, label } of SEARCH_ENGINE_OPTIONS) {
    const optLabel = document.createElement('label');
    optLabel.dataset.tooltip =
      id === 'custom'
        ? 'Use your own search engine by supplying a URL template.'
        : `Use ${label} for address bar searches.`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'search-engine';
    radio.value = id;
    radio.checked = currentId === id;
    radio.addEventListener('change', async () => {
      if (id !== 'custom') {
        const result = await api.invoke('settings:setSearchEngine', { id });
        if (result && result.error) alert(result.error);
        onSettingsChange();
      } else {
        customInput.classList.remove('hidden');
        customInput.focus();
      }
    });
    optLabel.appendChild(radio);
    optLabel.append(` ${label}`);
    row.appendChild(optLabel);
  }
  wrap.appendChild(row);

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
  wrap.appendChild(customInput);

  return wrap;
}

function buildPrivacySection(api, onCleared) {
  const wrap = document.createElement('div');

  const options = [
    { key: 'history', label: 'Browsing history', tooltip: 'Deletes your saved browsing history.' },
    { key: 'cache', label: 'Cached files', tooltip: 'Frees up space; some pages may load slower next time.' },
    { key: 'cookies', label: 'Cookies & site data', tooltip: 'Signs you out of most sites.' },
  ];
  const checkboxes = {};
  for (const opt of options) {
    const row = document.createElement('label');
    row.className = 'checkbox-row';
    row.dataset.tooltip = opt.tooltip;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    checkboxes[opt.key] = cb;
    row.appendChild(cb);
    row.append(` ${opt.label}`);
    wrap.appendChild(row);
  }

  const clearBtn = document.createElement('button');
  clearBtn.className = 'icon-btn danger-btn';
  clearBtn.style.width = '100%';
  clearBtn.textContent = 'Clear Browsing Data';
  clearBtn.dataset.tooltip = 'Permanently deletes the selected data. This cannot be undone.';
  clearBtn.addEventListener('click', async () => {
    const payload = {
      history: checkboxes.history.checked,
      cache: checkboxes.cache.checked,
      cookies: checkboxes.cookies.checked,
    };
    if (!payload.history && !payload.cache && !payload.cookies) return;
    await api.invoke('privacy:clearData', payload);
    onCleared();
  });
  wrap.appendChild(clearBtn);

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

  const clearBtn = document.createElement('button');
  clearBtn.className = 'icon-btn danger-btn';
  clearBtn.style.width = '100%';
  clearBtn.textContent = 'Clear History';
  clearBtn.dataset.tooltip = 'Deletes all saved browsing history.';
  clearBtn.addEventListener('click', async () => {
    await api.invoke('history:clear');
    onCleared();
  });
  wrap.appendChild(clearBtn);

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

function emptyRow(text) {
  const row = document.createElement('div');
  row.className = 'row';
  row.textContent = text;
  return row;
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
