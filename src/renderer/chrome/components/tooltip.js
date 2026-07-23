const SHOW_DELAY_MS = 450;

/**
 * Event-delegation based tooltip: works for any element with a
 * data-tooltip attribute, including ones added by later re-renders,
 * without needing to re-attach listeners each time.
 */
export function initTooltips(root) {
  let bubble = null;
  let showTimer = null;
  let currentTarget = null;

  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement('div');
    bubble.className = 'tooltip-bubble';
    document.body.appendChild(bubble);
    return bubble;
  }

  function position(target) {
    const rect = target.getBoundingClientRect();
    const b = ensureBubble();
    b.style.left = '0px';
    b.style.top = '0px';
    const bRect = b.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - bRect.width / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - bRect.width - 6));
    const top = rect.bottom + 8;
    b.style.left = `${left}px`;
    b.style.top = `${top}px`;
  }

  function show(target) {
    const text = target.getAttribute('data-tooltip');
    if (!text) return;
    currentTarget = target;
    const b = ensureBubble();
    b.textContent = text;
    b.classList.add('visible');
    position(target);
  }

  function hide() {
    clearTimeout(showTimer);
    showTimer = null;
    currentTarget = null;
    if (bubble) bubble.classList.remove('visible');
  }

  root.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target || target === currentTarget) return;
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(target), SHOW_DELAY_MS);
  });

  root.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    if (e.relatedTarget && target.contains(e.relatedTarget)) return;
    hide();
  });

  root.addEventListener('mousedown', hide);
  root.addEventListener('scroll', hide, true);
}
