export function renderSettingsPanel(el, state, api, { onSettingsChange }) {
  el.innerHTML = '';
  const settings = state.settings || {};
  const theme = settings.theme || { mode: 'system' };

  el.appendChild(heading('Appearance'));

  const modeRow = document.createElement('div');
  modeRow.className = 'row';
  for (const mode of ['light', 'dark', 'system']) {
    const label = document.createElement('label');
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

  el.appendChild(heading('Bookmarks'));
  const bmRow = document.createElement('div');
  bmRow.className = 'row';
  const bmLabel = document.createElement('label');
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

  el.appendChild(heading('Extensions'));
  const extList = document.createElement('div');
  el.appendChild(extList);
  refreshExtensionList(extList, api, () => renderSettingsPanel(el, state, api, { onSettingsChange }));

  const loadBtn = document.createElement('button');
  loadBtn.className = 'icon-btn';
  loadBtn.style.width = '100%';
  loadBtn.textContent = 'Load Unpacked Extension…';
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
}

function heading(text) {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}

async function refreshExtensionList(extList, api, onRemoved) {
  const extensions = await api.invoke('extensions:list');
  extList.innerHTML = '';
  if (extensions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'row';
    empty.textContent = 'No extensions loaded';
    extList.appendChild(empty);
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
    remove.title = 'Remove extension';
    remove.addEventListener('click', async () => {
      await api.invoke('extensions:remove', { id: ext.id });
      onRemoved();
    });
    row.appendChild(name);
    row.appendChild(remove);
    extList.appendChild(row);
  }
}
