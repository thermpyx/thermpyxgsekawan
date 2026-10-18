/* Shared navigation labels and a circular reveal from the chosen theme control. */
(() => {
  'use strict';
  const themeSelector = '#themeToggle, #mobileThemeToggle, #darkBtn, #themeButton';
  const root = document.documentElement;
  // The outer music shell owns its state; only content documents have controls.
  if (!document.querySelector(themeSelector)) return;
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
    const actionEn = `Switch to ${light ? 'dark' : 'light'} mode`;
    const actionId = `Beralih ke ${light ? 'mode gelap' : 'mode terang'}`;
    const action = id ? actionId : actionEn;
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
      if (text) {
        text.dataset.en = light ? 'Dark Mode' : 'Light Mode';
        text.dataset.id = light ? 'Mode Gelap' : 'Mode Terang';
        if (text.textContent !== label) text.textContent = label;
      }
      button.setAttribute('data-aria-label-en', actionEn);
      button.setAttribute('data-aria-label-id', actionId);
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
    try { window.parent.TPXPersistentShell?.syncState(window); } catch (_) {}
  }

  function revealSurface() {
    try {
      if (window.parent !== window && window.parent.TPXPersistentShell?.owns(window)) {
        const frame = window.frameElement.getBoundingClientRect();
        return { document: window.parent.document, window: window.parent, offsetX: frame.left, offsetY: frame.top };
      }
    } catch (_) {}
    return { document, window, offsetX: 0, offsetY: 0 };
  }

  async function fallbackReveal(surface, x, y, radius, mode, commit) {
    const layer = surface.document.createElement('div');
    layer.className = 'theme-reveal-fallback';
    layer.dataset.mode = mode;
    layer.setAttribute('aria-hidden', 'true');
    surface.document.body.append(layer);
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
    const surface = revealSurface();
    const viewRoot = surface.document.documentElement;
    const width = surface.window.innerWidth, height = surface.window.innerHeight;
    const rect = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(width, rect.left + rect.width / 2 + surface.offsetX));
    const y = Math.max(0, Math.min(height, rect.top + rect.height / 2 + surface.offsetY));
    const radius = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) + 2;
    let transition;
    try {
      if (reducedMotion()) { commit(); return; }
      root.classList.add('theme-revealing');
      viewRoot.classList.add('theme-revealing');
      if (typeof surface.document.startViewTransition === 'function' && typeof viewRoot.animate === 'function') {
        transition = surface.document.startViewTransition(commit);
        // finished can reject if a browser skips its snapshot, so attach a handler immediately.
        const finished = transition.finished.catch(() => {});
        await transition.ready;
        await viewRoot.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: 'cubic-bezier(.2,.65,.3,1)', pseudoElement: '::view-transition-new(root)' }
        ).finished;
        await finished;
      } else {
        await fallbackReveal(surface, x, y, radius, mode, commit);
      }
    } catch (_) {
      transition?.skipTransition();
      commit();
    } finally {
      root.classList.remove('theme-revealing');
      viewRoot.classList.remove('theme-revealing');
      changing = false;
    }
  }, true);

  const navPaths = {
    '#home': '<path d="m3 10 9-7 9 7v10H6V10m4 10v-7h5v7"/>',
    'learning.html': '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8M19 17v-4"/>',
    'feedback': '<path d="M4 4h16v12H8l-4 4V4Z"/><path d="M8 8h8m-8 4h5"/>',
    '#theory': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    '#calculation': '<path d="M18 4H6l7 8-7 8h12"/>',
    '#converter': '<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',
    '#quiz': '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 3 3 6-7"/>',
    '#history': '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-4v6l4 2"/>',
    '#about': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>'
  };
  document.querySelectorAll('.sidebar .nav-item').forEach(link => {
    const icon = link.querySelector('.nav-icon');
    const key = link.hasAttribute('data-feedback-open') ? 'feedback' : link.getAttribute('href');
    // Brand identity supplies the recognizable apparatus and the custom X.
    if (!icon || icon.hasAttribute('data-tpx-brand-icon') || key === '#simulator' || !navPaths[key]) return;
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = svg(navPaths[key]);
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
    if (!link.matches(themeSelector) && !link.hasAttribute('aria-label')) link.setAttribute('aria-label', link.querySelector('.nav-text')?.textContent.trim() || '');
    link.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showTooltip(link); });
    link.addEventListener('focus', () => showTooltip(link));
    link.addEventListener('pointerleave', () => {
      dismissedLink = null;
      if (!link.matches(':focus-visible')) hideTooltip();
    });
    link.addEventListener('blur', () => { dismissedLink = null; hideTooltip(); });
    link.addEventListener('click', hideTooltip);
  });
  const dismissTooltip = event => {
    if (event.key === 'Escape') { dismissedLink = currentLink; hideTooltip(); }
  };
  document.addEventListener('keydown', dismissTooltip);
  // Hovering an iframe does not move keyboard focus out of the music shell.
  // Escape must still dismiss its tooltip, without retaining old page listeners.
  let shellKeyTarget = null;
  const bindShellKeys = () => {
    try {
      if (window.parent !== window && window.parent.TPXPersistentShell?.owns(window)) {
        shellKeyTarget = window.parent.document;
        shellKeyTarget.addEventListener('keydown', dismissTooltip);
      }
    } catch (_) {}
  };
  bindShellKeys();
  window.addEventListener('pagehide', () => shellKeyTarget?.removeEventListener('keydown', dismissTooltip));
  window.addEventListener('pageshow', bindShellKeys);
  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
  window.addEventListener('thermpyx:languagechange', () => { hideTooltip(); syncControls(); });
  window.addEventListener('thermpyx:themechange', syncControls);
  window.addEventListener('storage', event => {
    if (event.key === 'thermpyx-theme') applyTheme(event.newValue === 'light' ? 'light' : 'dark', false);
  });
  // External setters (including the persistent shell and other tabs) keep the same UI.
  const controlObserver = new MutationObserver(syncControls);
  controlObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const hydrate = () => applyTheme(read('thermpyx-theme') === 'light' ? 'light' : 'dark', false);
  hydrate();
  document.addEventListener('DOMContentLoaded', syncControls, { once: true });
  window.addEventListener('pageshow', hydrate);
})();
