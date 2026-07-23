/** Our own local new-tab page shouldn't leak its internal file:// URL into the address field. */
function isNewTabUrl(url) {
  return !!url && url.startsWith('file://') && url.includes('/renderer/newtab/');
}

function attachSelectAllOnClick(input) {
  let wasFocused = false;
  input.addEventListener('mousedown', () => {
    wasFocused = document.activeElement === input;
  });
  input.addEventListener('mouseup', (e) => {
    if (!wasFocused) {
      e.preventDefault();
      input.select();
    }
  });
  input.addEventListener('focus', () => input.select());
}

function makeButton(label, disabled, tooltip, onClick) {
  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.textContent = label;
  btn.disabled = !!disabled;
  if (tooltip) btn.dataset.tooltip = tooltip;
  btn.addEventListener('click', onClick);
  return btn;
}

/** Renders the merged toolbar (back/forward/reload) used by the compact layout. */
export function renderCompactToolbar(el, state, api) {
  const tab = state.tabs.find((t) => t.id === state.activeId);
  el.innerHTML = '';
  el.appendChild(
    makeButton('←', !tab || !tab.canGoBack, 'Back', () => api.invoke('tabs:goBack', { id: state.activeId }))
  );
  el.appendChild(
    makeButton('→', !tab || !tab.canGoForward, 'Forward', () =>
      api.invoke('tabs:goForward', { id: state.activeId })
    )
  );
  el.appendChild(
    makeButton(tab && tab.isLoading ? '✕' : '⟳', !tab, tab && tab.isLoading ? 'Stop' : 'Reload', () =>
      tab && tab.isLoading
        ? api.invoke('tabs:stop', { id: state.activeId })
        : api.invoke('tabs:reload', { id: state.activeId })
    )
  );
}

const SHARE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .06 1.19L8.9 8.51a3 3 0 1 0 0 6.98l6.16 3.32A3 3 0 1 0 18 16a2.98 2.98 0 0 0-.94.15l-6.16-3.32a3.02 3.02 0 0 0 0-1.66l6.16-3.32c.28.1.6.15.94.15Z"/></svg>';

/**
 * A pill's outer element (favicon + variable "body" + close button) is
 * reused across renders, keyed by tab id, instead of being torn down and
 * rebuilt every time. The strip re-renders on background events (favicon/
 * title/loading changes for any tab); without reuse, a new tab's entrance
 * animation would be cut short before it's ever visible, and the active
 * tab's address input would need its focus/caret manually restored on every
 * keystroke's worth of unrelated updates.
 */
function createPill(tab, api, onChange) {
  const pill = document.createElement('div');
  pill.dataset.tabId = tab.id;

  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  pill.appendChild(favicon);

  // display:contents keeps this purely as a DOM/reconciliation boundary —
  // its children lay out exactly as if they were direct children of the
  // pill's flex container, so no CSS changes are needed for it.
  const body = document.createElement('span');
  body.className = 'pill-body';
  body.style.display = 'contents';
  pill.appendChild(body);

  const close = document.createElement('span');
  close.className = 'close';
  close.textContent = '✕';
  pill.appendChild(close);

  pill.addEventListener('auxclick', async (e) => {
    if (e.button === 1) {
      await api.invoke('tabs:close', { id: tab.id });
      onChange();
    }
  });

  pill.classList.add('compact-pill-entering');
  pill.addEventListener('animationend', () => pill.classList.remove('compact-pill-entering'), { once: true });

  return pill;
}

function buildActiveBody(body) {
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  attachSelectAllOnClick(input);
  body.appendChild(input);

  const shareBtn = document.createElement('button');
  shareBtn.className = 'star-btn share-btn';
  shareBtn.dataset.tooltip = 'Share this page';
  shareBtn.innerHTML = SHARE_ICON_SVG;
  body.appendChild(shareBtn);

  const star = document.createElement('button');
  star.className = 'star-btn bookmark-btn';
  body.appendChild(star);
}

function refreshActiveBody(body, tab, state, api, { onBookmarkChange, onShare }) {
  const isNewTab = isNewTabUrl(tab.url);

  const input = body.querySelector('input');
  // The DOM node persists across renders now, so the browser preserves
  // focus/caret on its own -- just don't clobber the value while the user
  // is actively typing into it.
  if (document.activeElement !== input) {
    input.value = isNewTab ? '' : tab.url;
  }
  input.placeholder = isNewTab ? 'Enter URL here' : 'Search or enter address';
  input.onkeydown = async (e) => {
    if (e.key === 'Enter') {
      await api.invoke('tabs:navigate', { id: tab.id, input: input.value });
      input.blur();
    } else if (e.key === 'Escape') {
      input.value = isNewTab ? '' : tab.url;
      input.blur();
    }
  };

  const canActOnPage = !isNewTab;
  const shareBtn = body.querySelector('.share-btn');
  shareBtn.disabled = !canActOnPage;
  shareBtn.onclick = (e) => {
    e.stopPropagation();
    if (canActOnPage && onShare) onShare(tab);
  };

  const isBookmarked = canActOnPage && state.bookmarks.bookmarks.some((b) => b.url === tab.url);
  const star = body.querySelector('.bookmark-btn');
  star.disabled = !canActOnPage;
  star.textContent = isBookmarked ? '★' : '☆';
  star.dataset.tooltip = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
  star.onclick = async (e) => {
    e.stopPropagation();
    if (!canActOnPage) return;
    const existing = state.bookmarks.bookmarks.find((b) => b.url === tab.url);
    if (existing) await api.invoke('bookmarks:remove', { id: existing.id });
    else await api.invoke('bookmarks:add', { url: tab.url, title: tab.title || tab.url });
    onBookmarkChange();
  };
}

function buildInactiveBody(body) {
  const title = document.createElement('span');
  title.className = 'title';
  body.appendChild(title);
}

function refreshInactiveBody(body, tab) {
  body.querySelector('.title').textContent = tab.isLoading ? 'Loading…' : tab.title || tab.url || 'New Tab';
}

function updatePill(pill, tab, isActive, state, api, callbacks) {
  pill.className =
    'compact-pill' +
    (isActive ? ' active' : '') +
    (tab.isPrivate ? ' private' : '') +
    (pill.classList.contains('compact-pill-entering') ? ' compact-pill-entering' : '');
  pill.onclick = isActive ? null : () => api.invoke('tabs:switch', { id: tab.id });

  const favicon = pill.querySelector('.favicon');
  favicon.style.display = tab.favicon ? '' : 'none';
  if (tab.favicon) favicon.src = tab.favicon;

  const body = pill.querySelector('.pill-body');
  const wantMode = isActive ? 'active' : 'inactive';
  if (body.dataset.mode !== wantMode) {
    body.dataset.mode = wantMode;
    body.innerHTML = '';
    if (wantMode === 'active') buildActiveBody(body);
    else buildInactiveBody(body);
  }
  if (wantMode === 'active') refreshActiveBody(body, tab, state, api, callbacks);
  else refreshInactiveBody(body, tab);

  const close = pill.querySelector('.close');
  close.onclick = async (e) => {
    e.stopPropagation();
    await api.invoke('tabs:close', { id: tab.id });
    callbacks.onChange();
  };
}

export function renderCompactTabStrip(el, state, api, callbacks) {
  const existing = new Map();
  el.querySelectorAll('.compact-pill').forEach((p) => existing.set(p.dataset.tabId, p));

  let anchor = null;
  for (const tab of state.tabs) {
    let pill = existing.get(tab.id);
    if (pill) {
      existing.delete(tab.id);
    } else {
      pill = createPill(tab, api, callbacks.onChange);
    }
    updatePill(pill, tab, tab.id === state.activeId, state, api, callbacks);

    const wantedNextSibling = anchor ? anchor.nextSibling : el.firstChild;
    if (wantedNextSibling !== pill) el.insertBefore(pill, wantedNextSibling);
    anchor = pill;
  }

  for (const stalePill of existing.values()) stalePill.remove();

  let addBtn = el.querySelector('.compact-add');
  if (!addBtn) {
    addBtn = document.createElement('button');
    addBtn.className = 'icon-btn compact-add';
    addBtn.textContent = '+';
    addBtn.dataset.tooltip = 'New Tab';
    addBtn.addEventListener('click', async () => {
      await api.invoke('tabs:create', {});
      callbacks.onChange();
    });
  }
  el.appendChild(addBtn);
}
