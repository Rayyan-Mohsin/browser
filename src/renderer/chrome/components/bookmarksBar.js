export function renderBookmarksBar(el, state, api) {
  el.innerHTML = '';
  if (!state.settings || !state.settings.showBookmarksBar) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');

  const rootBookmarks = state.bookmarks.bookmarks.filter((b) => b.folderId === 'root');
  for (const bookmark of rootBookmarks) {
    const chip = document.createElement('div');
    chip.className = 'bookmark-chip';
    chip.textContent = bookmark.title;
    chip.title = bookmark.url;
    chip.addEventListener('click', () => {
      if (state.activeId) api.invoke('tabs:navigate', { id: state.activeId, input: bookmark.url });
    });
    el.appendChild(chip);
  }
}
