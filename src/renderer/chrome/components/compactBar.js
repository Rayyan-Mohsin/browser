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

/**
 * Renders the Safari-style compact tab strip: the active tab expands into an
 * editable address field (favicon, URL input, share/star/close), while
 * inactive tabs stay as small favicon+title pills.
 */
export function renderCompactTabStrip(el, state, api, { onChange, onBookmarkChange, onShare }) {
  // The whole strip is rebuilt on every render (fired on background events
  // like favicon/title updates for any tab), which would otherwise wipe out
  // whatever the user is actively typing into the active tab's address
  // field. Snapshot the focused input's value/caret first and restore them
  // onto its replacement.
  const prevInput = el.querySelector('.compact-pill.active input');
  const wasFocused = prevInput === document.activeElement;
  const focusedTabId = wasFocused ? el.querySelector('.compact-pill.active').dataset.tabId : null;
  const focusedSnapshot = wasFocused
    ? { value: prevInput.value, start: prevInput.selectionStart, end: prevInput.selectionEnd }
    : null;

  el.innerHTML = '';

  for (const tab of state.tabs) {
    const isActive = tab.id === state.activeId;
    const pill = document.createElement('div');
    pill.className = 'compact-pill' + (isActive ? ' active' : '');
    pill.dataset.tabId = tab.id;

    if (tab.favicon) {
      const img = document.createElement('img');
      img.className = 'favicon';
      img.src = tab.favicon;
      pill.appendChild(img);
    }

    if (isActive) {
      const restoring = focusedTabId === tab.id && focusedSnapshot;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = restoring ? focusedSnapshot.value : tab.url;
      input.autocomplete = 'off';
      input.spellcheck = false;
      attachSelectAllOnClick(input);
      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          await api.invoke('tabs:navigate', { id: tab.id, input: input.value });
          input.blur();
        } else if (e.key === 'Escape') {
          input.value = tab.url;
          input.blur();
        }
      });
      pill.appendChild(input);

      if (restoring) {
        requestAnimationFrame(() => {
          input.focus();
          input.setSelectionRange(focusedSnapshot.start, focusedSnapshot.end);
        });
      }

      const isBookmarked = state.bookmarks.bookmarks.some((b) => b.url === tab.url);
      const shareBtn = document.createElement('button');
      shareBtn.className = 'star-btn';
      shareBtn.dataset.tooltip = 'Share this page';
      shareBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .06 1.19L8.9 8.51a3 3 0 1 0 0 6.98l6.16 3.32A3 3 0 1 0 18 16a2.98 2.98 0 0 0-.94.15l-6.16-3.32a3.02 3.02 0 0 0 0-1.66l6.16-3.32c.28.1.6.15.94.15Z"/></svg>';
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onShare) onShare(tab);
      });
      pill.appendChild(shareBtn);

      const star = document.createElement('button');
      star.className = 'star-btn';
      star.textContent = isBookmarked ? '★' : '☆';
      star.dataset.tooltip = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
      star.addEventListener('click', async (e) => {
        e.stopPropagation();
        const existing = state.bookmarks.bookmarks.find((b) => b.url === tab.url);
        if (existing) await api.invoke('bookmarks:remove', { id: existing.id });
        else await api.invoke('bookmarks:add', { url: tab.url, title: tab.title || tab.url });
        onBookmarkChange();
      });
      pill.appendChild(star);
    } else {
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = tab.isLoading ? 'Loading…' : tab.title || tab.url || 'New Tab';
      pill.appendChild(title);
      pill.addEventListener('click', () => api.invoke('tabs:switch', { id: tab.id }));
    }

    const close = document.createElement('span');
    close.className = 'close';
    close.textContent = '✕';
    close.addEventListener('click', async (e) => {
      e.stopPropagation();
      await api.invoke('tabs:close', { id: tab.id });
      onChange();
    });
    pill.appendChild(close);

    pill.addEventListener('auxclick', async (e) => {
      if (e.button === 1) {
        await api.invoke('tabs:close', { id: tab.id });
        onChange();
      }
    });

    el.appendChild(pill);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'icon-btn compact-add';
  addBtn.textContent = '+';
  addBtn.dataset.tooltip = 'New Tab';
  addBtn.addEventListener('click', async () => {
    await api.invoke('tabs:create', {});
    onChange();
  });
  el.appendChild(addBtn);
}
