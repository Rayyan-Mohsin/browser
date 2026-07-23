// Pills are reused across renders (keyed by tab id) instead of being torn
// down and rebuilt every time. The strip re-renders on background events
// (favicon/title/loading changes for any tab), and if a new tab's pill were
// destroyed and recreated mid-animation by one of those, its entrance
// animation would be cut short before it's ever visible.
function createPill(tab, api, onChange) {
  const pill = document.createElement('div');
  pill.dataset.tabId = tab.id;

  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  pill.appendChild(favicon);

  const title = document.createElement('span');
  title.className = 'title';
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

  pill.classList.add('tab-pill-entering');
  pill.addEventListener('animationend', () => pill.classList.remove('tab-pill-entering'), { once: true });

  return pill;
}

function updatePill(pill, tab, isActive) {
  pill.className =
    'tab-pill' +
    (isActive ? ' active' : '') +
    (tab.isPrivate ? ' private' : '') +
    (pill.classList.contains('tab-pill-entering') ? ' tab-pill-entering' : '');
  pill.title = tab.title || tab.url;

  const favicon = pill.querySelector('.favicon');
  favicon.style.display = tab.favicon ? '' : 'none';
  if (tab.favicon) favicon.src = tab.favicon;

  pill.querySelector('.title').textContent = tab.isLoading ? 'Loading…' : tab.title || tab.url || 'New Tab';
}

export function renderTabBar(el, state, api, { onChange }) {
  const existing = new Map();
  el.querySelectorAll('.tab-pill').forEach((p) => existing.set(p.dataset.tabId, p));

  let anchor = null;
  for (const tab of state.tabs) {
    let pill = existing.get(tab.id);
    if (pill) {
      existing.delete(tab.id);
    } else {
      pill = createPill(tab, api, onChange);
    }
    updatePill(pill, tab, tab.id === state.activeId);

    const wantedNextSibling = anchor ? anchor.nextSibling : el.firstChild;
    if (wantedNextSibling !== pill) el.insertBefore(pill, wantedNextSibling);
    anchor = pill;
  }

  // Whatever's left in `existing` belongs to closed tabs.
  for (const stalePill of existing.values()) stalePill.remove();

  let addBtn = el.querySelector('.tab-add');
  if (!addBtn) {
    addBtn = document.createElement('button');
    addBtn.className = 'icon-btn tab-add';
    addBtn.textContent = '+';
    addBtn.title = 'New Tab';
    addBtn.addEventListener('click', async () => {
      await api.invoke('tabs:create', {});
      onChange();
    });
  }
  el.appendChild(addBtn); // appendChild re-appending an existing node just moves it — keeps it last
}
