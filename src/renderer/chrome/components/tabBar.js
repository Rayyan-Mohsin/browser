import { createGroupChip, updateGroupChip } from './groupChip.js';

// Module-level (not per-pill) so a dragover/drop handler on any *other* pill
// can see which tab is currently being dragged without threading extra state
// through render(). Reset on dragend so a drag that's cancelled (dropped
// outside any pill) never leaves stale state behind.
let draggedTabId = null;
let draggedGroupId = null;

/** Ends a drop by placing the tab and updating its group membership as needed. */
async function finishDrop(api, draggedId, targetGroupId, beforeId) {
  await api.invoke('tabs:moveTab', { id: draggedId, beforeId });
  if (targetGroupId) {
    // Dropping onto a tab that's already in a group pulls the dragged tab
    // into that same group -- the "drag tabs into groups" gesture.
    if (targetGroupId !== draggedGroupId) await api.invoke('groups:addTab', { id: draggedId, groupId: targetGroupId });
  } else if (draggedGroupId) {
    // Dropped among ungrouped tabs (or empty space): leaving keeps every
    // group's tabs contiguous, which is what lets a group collapse into a
    // single chip.
    await api.invoke('groups:removeTab', { id: draggedId });
  }
}

// Pills are reused across renders (keyed by tab id) instead of being torn
// down and rebuilt every time. The strip re-renders on background events
// (favicon/title/loading changes for any tab), and if a new tab's pill were
// destroyed and recreated mid-animation by one of those, its entrance
// animation would be cut short before it's ever visible.
function createPill(tab, api, onChange) {
  const pill = document.createElement('div');
  pill.dataset.tabId = tab.id;
  pill.draggable = true;

  pill.addEventListener('dragstart', (e) => {
    draggedTabId = tab.id;
    draggedGroupId = pill.dataset.groupId || null;
    pill.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id);
  });
  pill.addEventListener('dragend', () => {
    draggedTabId = null;
    draggedGroupId = null;
    pill.classList.remove('dragging');
  });
  pill.addEventListener('dragover', (e) => {
    if (!draggedTabId || draggedTabId === tab.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    pill.classList.add('drag-over');
  });
  pill.addEventListener('dragleave', () => pill.classList.remove('drag-over'));
  pill.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation(); // let the tab-bar container's own drop handler only catch drops on empty space
    pill.classList.remove('drag-over');
    const draggedId = draggedTabId;
    draggedTabId = null;
    if (!draggedId || draggedId === tab.id) return;
    // Drop on the left half of the target pill inserts before it; the right
    // half inserts after it (i.e. before whatever currently follows it).
    const rect = pill.getBoundingClientRect();
    const dropBefore = e.clientX - rect.left < rect.width / 2;
    const beforeId = dropBefore ? tab.id : pill.nextElementSibling?.dataset.tabId || null;
    await finishDrop(api, draggedId, pill.dataset.groupId || null, beforeId);
    onChange();
  });

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
  pill.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    api.invoke('tabs:showContextMenu', { id: tab.id });
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
    (tab.groupColor ? ' grouped' : '') +
    (pill.classList.contains('dragging') ? ' dragging' : '') +
    (pill.classList.contains('drag-over') ? ' drag-over' : '') +
    (tab.groupId && tab.groupCollapsed ? ' group-collapsed-hidden' : '') +
    (pill.classList.contains('tab-pill-entering') ? ' tab-pill-entering' : '');
  pill.title = tab.groupName ? `${tab.title || tab.url} — ${tab.groupName}` : tab.title || tab.url;
  if (tab.groupColor) pill.style.setProperty('--group-color', tab.groupColor);
  else pill.style.removeProperty('--group-color');
  if (tab.groupId) pill.dataset.groupId = tab.groupId;
  else delete pill.dataset.groupId;

  const favicon = pill.querySelector('.favicon');
  favicon.style.display = tab.favicon ? '' : 'none';
  if (tab.favicon) favicon.src = tab.favicon;

  pill.querySelector('.title').textContent = tab.isLoading ? 'Loading…' : tab.title || tab.url || 'New Tab';
}

export function renderTabBar(el, state, api, { onChange }) {
  // Bound once: lets dropping a dragged tab on empty tab-bar space (not
  // directly on another pill) move it to the end, instead of the browser's
  // default drop behavior (which would otherwise do nothing useful here).
  if (!el.dataset.dndBound) {
    el.dataset.dndBound = '1';
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      const draggedId = draggedTabId;
      draggedTabId = null;
      if (draggedId) {
        await finishDrop(api, draggedId, null, null);
        onChange();
      }
    });
  }

  const existing = new Map();
  el.querySelectorAll('.tab-pill').forEach((p) => existing.set(p.dataset.tabId, p));
  const existingChips = new Map();
  el.querySelectorAll('.group-chip').forEach((c) => existingChips.set(c.dataset.groupId, c));

  const groupCounts = new Map();
  for (const tab of state.tabs) {
    if (tab.groupId) groupCounts.set(tab.groupId, (groupCounts.get(tab.groupId) || 0) + 1);
  }

  let anchor = null;
  let lastGroupId = null;
  for (const tab of state.tabs) {
    // Tabs sharing a group are kept contiguous by TabManager, so the group's
    // chip only needs to appear once, right before the first tab of its run.
    if (tab.groupId && tab.groupId !== lastGroupId) {
      let chip = existingChips.get(tab.groupId);
      if (chip) existingChips.delete(tab.groupId);
      else {
        chip = createGroupChip(api, onChange, async (groupId) => {
          const draggedId = draggedTabId;
          draggedTabId = null;
          if (draggedId) {
            await finishDrop(api, draggedId, groupId, null);
            onChange();
          }
        });
      }
      updateGroupChip(chip, tab, groupCounts.get(tab.groupId));
      const wantedNextSibling = anchor ? anchor.nextSibling : el.firstChild;
      if (wantedNextSibling !== chip) el.insertBefore(chip, wantedNextSibling);
      anchor = chip;
    }
    lastGroupId = tab.groupId || null;

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

  // Whatever's left in `existing`/`existingChips` belongs to closed tabs/groups.
  for (const stalePill of existing.values()) stalePill.remove();
  for (const staleChip of existingChips.values()) staleChip.remove();
}
