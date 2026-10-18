/* Shared navigation labels and a circular reveal from the chosen theme control. */
(() => {
  'use strict';
  const themeSelector = '#themeToggle, #mobileThemeToggle, #darkBtn, #themeButton';
  const root = document.documentElement;
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const read = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const language = () => window.TPX?.getLanguage?.() || read('thermpyx-language') || root.lang;
  const svg = paths => `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  const moon = '<path d="M20.8 13.2A8.8 8.8 0 0 1 10.8 3.2 8.8 8.8 0 1 0 20.8 13.2Z"/>';
  const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  let changing = false;

  function syncControls() {
    const light = document.body.classList.contains('light-mode');
    const id = language() === 'id';
    const label = light ? (id ? 'Mode Gelap' : 'Dark Mode') : (id ? 'Mode Terang' : 'Light Mode');
    const action = id ? `Aktifkan ${light ? 'mode gelap' : 'mode terang'}` : `Switch to ${light ? 'dark' : 'light'} mode`;
    root.dataset.theme = light ? 'light' : 'dark';
    document.querySelectorAll(themeSelector).forEach(button => {
      let icon = button.querySelector('#themeIcon, .theme-icon');
      let text = button.querySelector('#themeText, .theme-text, .nav-text');
      // Some simulator and mobile controls have no inner markup in the original page.
      if (!icon) {
        button.replaceChildren();
        icon = document.createElement('span');
        icon.className = 'theme-icon';
        button.append(icon);
        if (button.id !== 'mobileThemeToggle') {
          text = document.createElement('span');
          text.className = 'theme-text';
          button.append(text);
        }
      }
      icon.setAttribute('aria-hidden', 'true');
      const nextIcon = svg(light ? moon : sun);
      if (icon.innerHTML !== nextIcon) icon.innerHTML = nextIcon;
      if (text && text.textContent !== label) text.textContent = label;
      button.setAttribute('aria-label', action);
      button.setAttribute('aria-pressed', String(light));
      button.removeAttribute('title');
    });
  }

  function applyTheme(mode, persist = true) {
    const light = mode === 'light';
    document.body.classList.toggle('light-mode', light);
    // Retain the documented classes of the two older standalone simulations.
    if (document.getElementById('darkBtn')) document.body.classList.toggle('light', light);
    if (document.getElementById('themeButton')) document.body.classList.toggle('dark-mode', !light);
    root.dataset.theme = mode;
    if (persist) write('thermpyx-theme', mode);
    syncControls();
    window.dispatchEvent(new CustomEvent('thermpyx:themechange', { detail: { mode } }));
    window.dispatchEvent(new Event('resize'));
  }

  async function fallbackReveal(x, y, radius, mode, commit) {
    const layer = document.createElement('div');
    layer.className = 'theme-reveal-fallback';
    layer.dataset.mode = mode;
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    try {
      if (!layer.animate) { commit(); return; }
      await layer.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 430, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'forwards' }
      ).finished;
      commit();
      await layer.animate({ opacity: [1, 0] }, { duration: 130, fill: 'forwards' }).finished;
    } finally { layer.remove(); }
  }

  // Capture once, before the older per-page click listeners can toggle a second time.
  document.addEventListener('click', async event => {
    const button = event.target.closest?.(themeSelector);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hideTooltip();
    if (changing) return;
    changing = true;
    let committed = false;
    const mode = document.body.classList.contains('light-mode') ? 'dark' : 'light';
    const commit = () => {
      if (committed) return;
      committed = true;
      applyTheme(mode);
    };
    const rect = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight, rect.top + rect.height / 2));
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
    let transition;
    try {
      if (reducedMotion()) { commit(); return; }
      root.classList.add('theme-revealing');
      if (typeof document.startViewTransition === 'function' && typeof root.animate === 'function') {
        transition = document.startViewTransition(commit);
        // finished can reject if a browser skips its snapshot, so attach a handler immediately.
        const finished = transition.finished.catch(() => {});
        await transition.ready;
        await root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: 'cubic-bezier(.2,.65,.3,1)', pseudoElement: '::view-transition-new(root)' }
        ).finished;
        await finished;
      } else {
        await fallbackReveal(x, y, radius, mode, commit);
      }
    } catch (_) {
      transition?.skipTransition();
      commit();
    } finally {
      root.classList.remove('theme-revealing');
      changing = false;
    }
  }, true);

  const navPaths = {
    '#home': '<path d="m3 10 9-7 9 7v10H6V10m4 10v-7h5v7"/>',
    '#theory': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    '#calculation': '<path d="M18 4H6l7 8-7 8h12"/>',
    '#simulator': '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-45 12 12)"/>',
    '#converter': '<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',
    '#quiz': '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 3 3 6-7"/>',
    '#history': '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-4v6l4 2"/>',
    '#about': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>'
  };
  document.querySelectorAll('.sidebar .nav-item').forEach(link => {
    const icon = link.querySelector('.nav-icon');
    if (!icon || !navPaths[link.getAttribute('href')]) return;
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = svg(navPaths[link.getAttribute('href')]);
  });

  const tooltip = document.createElement('div');
  tooltip.className = 'navigation-tooltip';
  tooltip.id = 'navigationTooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  let currentLink = null;
  let dismissedLink = null;

  function hideTooltip() {
    tooltip.hidden = true;
    if (currentLink) {
      const descriptions = (currentLink.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id);
      if (descriptions.length) currentLink.setAttribute('aria-describedby', descriptions.join(' '));
      else currentLink.removeAttribute('aria-describedby');
    }
    currentLink = null;
  }

  function showTooltip(link) {
    if (dismissedLink === link) return;
    hideTooltip();
    const label = link.querySelector('.nav-text, .theme-text')?.textContent.trim() || link.getAttribute('aria-label');
    if (!label) return;
    tooltip.textContent = label;
    tooltip.hidden = false;
    const rect = link.getBoundingClientRect();
    const width = tooltip.offsetWidth, height = tooltip.offsetHeight;
    let left = rect.right + 14;
    // On a narrow screen move inside the viewport rather than covering its right edge.
    if (left + width > innerWidth - 12) left = rect.left - width - 14;
    tooltip.style.left = `${Math.max(12, Math.min(left, innerWidth - width - 12))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(rect.top + (rect.height - height) / 2, innerHeight - height - 8))}px`;
    const ids = (link.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!ids.includes(tooltip.id)) ids.push(tooltip.id);
    link.setAttribute('aria-describedby', ids.join(' '));
    currentLink = link;
  }

  document.querySelectorAll('.sidebar .nav-item, .sidebar .theme-toggle').forEach(link => {
    // Native title balloons and icon titles must not compete with the single shared label.
    [link, ...link.querySelectorAll('[title]')].forEach(node => node.removeAttribute('title'));
    if (!link.matches(themeSelector)) link.setAttribute('aria-label', link.querySelector('.nav-text')?.textContent.trim() || '');
    link.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showTooltip(link); });
    link.addEventListener('focus', () => showTooltip(link));
    link.addEventListener('pointerleave', () => {
      dismissedLink = null;
      if (document.activeElement !== link) hideTooltip();
    });
    link.addEventListener('blur', () => { dismissedLink = null; hideTooltip(); });
    link.addEventListener('click', hideTooltip);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { dismissedLink = currentLink; hideTooltip(); }
  });
  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
  window.addEventListener('thermpyx:languagechange', () => { hideTooltip(); syncControls(); });
  window.addEventListener('thermpyx:themechange', syncControls);
  window.addEventListener('storage', event => {
    if (event.key === 'thermpyx-theme') applyTheme(event.newValue === 'light' ? 'light' : 'dark', false);
  });
  const hydrate = () => applyTheme(read('thermpyx-theme') === 'light' ? 'light' : 'dark', false);
  hydrate();
  document.addEventListener('DOMContentLoaded', syncControls, { once: true });
  window.addEventListener('pageshow', hydrate);
})();
