/* Shared navigation labels and a theme reveal from the pressed control. */
(() => {
  'use strict';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let changing = false;
  document.addEventListener('click', async event => {
    const button = event.target.closest('#themeToggle, #mobileThemeToggle, #darkBtn');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (changing) return;
    changing = true;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const update = () => {
      const light = !document.body.classList.contains('light-mode');
      document.body.classList.toggle('light-mode', light);
      document.documentElement.dataset.theme = light ? 'light' : 'dark';
      localStorage.setItem('thermpyx-theme', light ? 'light' : 'dark');
      const id = localStorage.getItem('thermpyx-language') === 'id';
      const label = light ? (id ? 'Mode Gelap' : 'Dark Mode') : (id ? 'Mode Terang' : 'Light Mode');
      document.querySelectorAll('#themeIcon').forEach(el => el.textContent = light ? '☾' : '☀');
      document.querySelectorAll('#themeText').forEach(el => el.textContent = label);
      document.querySelectorAll('#themeToggle, #mobileThemeToggle, #darkBtn').forEach(el => {
        el.setAttribute('aria-label', label); el.setAttribute('aria-pressed', String(light));
      });
      window.dispatchEvent(new CustomEvent('thermpyx:themechange', {detail:{mode:light ? 'light' : 'dark'}}));
      window.dispatchEvent(new Event('resize'));
    };
    try {
      if (document.startViewTransition && !reduced()) {
        const transition = document.startViewTransition(update);
        await transition.ready;
        await document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]},
          {duration:520,easing:'cubic-bezier(.2,.65,.3,1)',pseudoElement:'::view-transition-new(root)'}).finished;
        await transition.finished;
      } else update();
    } finally { changing = false; }
  }, true);

  const initialLight = document.body.classList.contains('light-mode');
  const initialId = localStorage.getItem('thermpyx-language') === 'id';
  document.querySelectorAll('#themeText').forEach(el => el.textContent = initialLight ? (initialId?'Mode Gelap':'Dark Mode') : (initialId?'Mode Terang':'Light Mode'));
  document.querySelectorAll('#themeIcon').forEach(el => el.textContent = initialLight ? '☾' : '☀');
  const navPaths = [
    '<path d="m3 10 9-7 9 7v10H6V10m4 10v-7h5v7"/>',
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    '<path d="M18 4H6l7 8-7 8h12"/>',
    '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-45 12 12)"/>',
    '<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',
    '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 3 3 6-7"/>',
    '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-4v6l4 2"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>'
  ];
  document.querySelectorAll('.sidebar .nav-item .nav-icon').forEach((icon,index) => {
    if (!navPaths[index]) return;
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${navPaths[index]}</svg>`;
  });
  const tooltip = document.createElement('div');
  tooltip.className = 'navigation-tooltip'; tooltip.id = 'navigationTooltip';
  tooltip.setAttribute('role','tooltip'); tooltip.hidden = true;
  document.body.append(tooltip);
  const hide = () => { tooltip.hidden = true; document.querySelectorAll('[aria-describedby="navigationTooltip"]').forEach(el=>el.removeAttribute('aria-describedby')); };
  document.querySelectorAll('.sidebar .nav-item, .sidebar .theme-toggle').forEach(link => {
    link.removeAttribute('title');
    const show = () => {
      const rect = link.getBoundingClientRect();
      tooltip.textContent = link.querySelector('.nav-text')?.textContent.trim() || link.getAttribute('aria-label');
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(rect.right + 12, innerWidth - tooltip.offsetWidth - 12)}px`;
      tooltip.style.top = `${Math.max(8, Math.min(rect.top + rect.height / 2 - tooltip.offsetHeight / 2, innerHeight - tooltip.offsetHeight - 8))}px`;
      link.setAttribute('aria-describedby',tooltip.id);
    };
    link.addEventListener('pointerenter',show); link.addEventListener('focus',show);
    link.addEventListener('pointerleave',hide); link.addEventListener('blur',hide); link.addEventListener('click',hide);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  window.addEventListener('scroll',hide,true); window.addEventListener('resize',hide);
})();
