export function renderTabBar(el, state, api, { onChange }) {
  el.innerHTML = '';
  for (const tab of state.tabs) {
    const pill = document.createElement('div');
    pill.className = 'tab-pill' + (tab.id === state.activeId ? ' active' : '');
    pill.title = tab.title || tab.url;

    if (tab.favicon) {
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
