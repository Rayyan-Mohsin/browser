export function renderToolbar(el, state, api) {
  const tab = state.tabs.find((t) => t.id === state.activeId);
  el.innerHTML = '';

  el.appendChild(
    makeButton('←', !tab || !tab.canGoBack, () => api.invoke('tabs:goBack', { id: state.activeId }))
  );
  el.appendChild(
    makeButton('→', !tab || !tab.canGoForward, () => api.invoke('tabs:goForward', { id: state.activeId }))
  );
  el.appendChild(
    makeButton(tab && tab.isLoading ? '✕' : '⟳', !tab, () =>
      tab && tab.isLoading
        ? api.invoke('tabs:stop', { id: state.activeId })
        : api.invoke('tabs:reload', { id: state.activeId })
    )
  );
}

function makeButton(label, disabled, onClick) {
  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.textContent = label;
  btn.disabled = !!disabled;
  btn.addEventListener('click', onClick);
  return btn;
}
