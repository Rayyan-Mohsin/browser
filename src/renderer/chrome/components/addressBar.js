/** Our own local new-tab page shouldn't leak its internal file:// URL into the address bar. */
function isNewTabUrl(url) {
  return !!url && url.startsWith('file://') && url.includes('/renderer/newtab/');
}

function displayUrlFor(tab) {
  if (!tab || isNewTabUrl(tab.url)) return '';
  return tab.url;
}

function attachSelectAllOnClick(input) {
  let wasFocused = false;
  input.addEventListener('mousedown', () => {
    wasFocused = document.activeElement === input;
  });
  input.addEventListener('mouseup', (e) => {
    // Only the transition-into-focus click should select all; a second
    // click while already focused should place the caret normally so the
    // user can still edit in place.
    if (!wasFocused) {
      e.preventDefault();
      input.select();
    }
  });
  input.addEventListener('focus', () => input.select());
}

export function renderAddressBar(el, state, api, { onBookmarkChange, onShare }) {
  const tab = state.tabs.find((t) => t.id === state.activeId);

  // Rebuilt from scratch like every other component, except for the text
  // input itself: recreating it on every render (which fires on background
  // events like favicon/title updates for any tab) would wipe out whatever
  // the user is actively typing. Reuse it across renders instead, and only
  // overwrite its value when it isn't focused or the active tab changed.
  let input = el.querySelector('input');
  const inputWasFocused = input === document.activeElement;
  const tabChanged = !input || input.dataset.tabId !== (state.activeId || '');

  if (!input) {
    input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    attachSelectAllOnClick(input);
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && state.activeId) {
        await api.invoke('tabs:navigate', { id: state.activeId, input: input.value });
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = displayUrlFor(tab);
        input.blur();
      }
    });
  }
  input.placeholder = isNewTabUrl(tab && tab.url) ? 'Enter URL here' : 'Search or enter address';
  if (!inputWasFocused || tabChanged) {
    input.value = displayUrlFor(tab);
  }
  input.dataset.tabId = state.activeId || '';
  input.classList.toggle('private-active', !!tab && tab.isPrivate);

  el.innerHTML = '';

  if (tab && tab.isPrivate) {
    const badge = document.createElement('span');
    badge.className = 'private-badge';
    badge.dataset.tooltip = 'This tab is private: history and cookies aren’t saved.';
    badge.textContent = 'Private';
    el.appendChild(badge);
  }

  el.appendChild(input);

  const canActOnPage = !!tab && !isNewTabUrl(tab.url);

  const shareBtn = document.createElement('button');
  shareBtn.className = 'icon-btn';
  shareBtn.dataset.tooltip = 'Share this page';
  shareBtn.disabled = !canActOnPage;
  shareBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .06 1.19L8.9 8.51a3 3 0 1 0 0 6.98l6.16 3.32A3 3 0 1 0 18 16a2.98 2.98 0 0 0-.94.15l-6.16-3.32a3.02 3.02 0 0 0 0-1.66l6.16-3.32c.28.1.6.15.94.15Z"/></svg>';
  shareBtn.addEventListener('click', () => {
    if (canActOnPage && onShare) onShare(tab);
  });
  el.appendChild(shareBtn);

  const star = document.createElement('button');
  star.className = 'icon-btn';
  const isBookmarked = canActOnPage && state.bookmarks.bookmarks.some((b) => b.url === tab.url);
  star.textContent = isBookmarked ? '★' : '☆';
  star.dataset.tooltip = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
  star.disabled = !canActOnPage;
  star.addEventListener('click', async () => {
    if (!tab) return;
    const existing = state.bookmarks.bookmarks.find((b) => b.url === tab.url);
    if (existing) {
      await api.invoke('bookmarks:remove', { id: existing.id });
    } else {
      await api.invoke('bookmarks:add', { url: tab.url, title: tab.title || tab.url });
    }
    onBookmarkChange();
  });
  el.appendChild(star);
}
