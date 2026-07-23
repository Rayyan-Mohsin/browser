export function renderAddressBar(el, state, api, { onBookmarkChange }) {
  const tab = state.tabs.find((t) => t.id === state.activeId);
  el.innerHTML = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search or enter address';
  input.value = tab ? tab.url : '';
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && state.activeId) {
      await api.invoke('tabs:navigate', { id: state.activeId, input: input.value });
    }
  });
  el.appendChild(input);

  const star = document.createElement('button');
  star.className = 'icon-btn';
  const isBookmarked = !!tab && state.bookmarks.bookmarks.some((b) => b.url === tab.url);
  star.textContent = isBookmarked ? '★' : '☆';
  star.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
  star.disabled = !tab;
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
