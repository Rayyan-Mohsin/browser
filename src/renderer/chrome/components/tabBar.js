// Persists across renders (the strip is rebuilt from scratch every render)
// so a tab only ever plays its entrance animation once, right after it's
// actually created — not on every subsequent re-render triggered by
// unrelated events like a favicon arriving.
const seenTabIds = new Set();

export function renderTabBar(el, state, api, { onChange }) {
  el.innerHTML = '';
  for (const tab of state.tabs) {
    const pill = document.createElement('div');
    pill.className =
      'tab-pill' +
      (tab.id === state.activeId ? ' active' : '') +
      (tab.isPrivate ? ' private' : '') +
      (seenTabIds.has(tab.id) ? '' : ' tab-pill-entering');
    pill.title = tab.title || tab.url;

    if (tab.isPrivate) {
      const badge = document.createElement('span');
      badge.className = 'private-dot';
      badge.dataset.tooltip = 'This tab is private: history and cookies aren’t saved.';
      badge.textContent = '🕶️';
      pill.appendChild(badge);
    } else if (tab.favicon) {
      const img = document.createElement('img');
      img.className = 'favicon';
      img.src = tab.favicon;
      pill.appendChild(img);
    }

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = tab.isLoading ? 'Loading…' : tab.title || tab.url || 'New Tab';
    pill.appendChild(title);

    const close = document.createElement('span');
    close.className = 'close';
    close.textContent = '✕';
    close.addEventListener('click', async (e) => {
      e.stopPropagation();
      await api.invoke('tabs:close', { id: tab.id });
      onChange();
    });
    pill.appendChild(close);

    pill.addEventListener('click', () => api.invoke('tabs:switch', { id: tab.id }));
    pill.addEventListener('auxclick', async (e) => {
      if (e.button === 1) {
        await api.invoke('tabs:close', { id: tab.id });
        onChange();
      }
    });

    el.appendChild(pill);
  }

  for (const tab of state.tabs) seenTabIds.add(tab.id);
  for (const id of seenTabIds) {
    if (!state.tabs.some((t) => t.id === id)) seenTabIds.delete(id);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'icon-btn tab-add';
  addBtn.textContent = '+';
  addBtn.title = 'New Tab';
  addBtn.addEventListener('click', async () => {
    await api.invoke('tabs:create', {});
    onChange();
  });
  el.appendChild(addBtn);
}
