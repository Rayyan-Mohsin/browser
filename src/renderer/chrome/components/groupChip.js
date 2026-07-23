/**
 * Shared by both tab bar layouts: a group's always-visible, clickable label.
 * Clicking it toggles the group between expanded (member tabs shown normally,
 * each still marked with the thin colored line) and collapsed (member tabs
 * hidden, replaced by just this one chip) -- lets a user compact a group of
 * related tabs out of the way, then expand it again on demand.
 */
/**
 * `onDropTab(groupId)`: called when a dragged tab is dropped directly on
 * this chip. Needed because collapsing a group hides its member pills --
 * without this, a collapsed group would have no drop target at all, even
 * though it's still one of the places you'd naturally want to drag a tab.
 */
export function createGroupChip(api, onChange, onDropTab) {
  const chip = document.createElement('div');
  chip.className = 'group-chip';

  const dot = document.createElement('span');
  dot.className = 'group-chip-dot';
  chip.appendChild(dot);

  const label = document.createElement('span');
  label.className = 'group-chip-label';
  chip.appendChild(label);

  chip.addEventListener('click', async (e) => {
    e.stopPropagation();
    await api.invoke('groups:toggleCollapse', { groupId: chip.dataset.groupId });
    onChange();
  });
  chip.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    api.invoke('groups:showContextMenu', { groupId: chip.dataset.groupId });
  });
  chip.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    chip.classList.add('drag-over');
  });
  chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));
  chip.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    chip.classList.remove('drag-over');
    if (onDropTab) onDropTab(chip.dataset.groupId);
  });

  return chip;
}

export function updateGroupChip(chip, tab, memberCount) {
  chip.dataset.groupId = tab.groupId;
  chip.classList.toggle('collapsed', !!tab.groupCollapsed);
  chip.style.setProperty('--group-color', tab.groupColor);
  chip.querySelector('.group-chip-dot').style.background = tab.groupColor;
  chip.querySelector('.group-chip-label').textContent = tab.groupCollapsed
    ? `${tab.groupName} (${memberCount})`
    : tab.groupName;
  chip.title = tab.groupCollapsed ? `Expand "${tab.groupName}"` : `Collapse "${tab.groupName}"`;
}
