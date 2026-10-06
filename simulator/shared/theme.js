/* Single THERMPYX color mode for the standalone simulators. */
(() => {
    const key = 'thermpyx-theme';
    const body = document.body;
    const toggle = document.getElementById('themeToggle') || document.getElementById('darkBtn');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    const read = () => { try { return localStorage.getItem(key); } catch (_) { return null; } };
    const write = mode => { try { localStorage.setItem(key, mode); } catch (_) {} };
    function setMode(mode, persist = false) {
        const light = mode === 'light';
        body.classList.toggle('light-mode', light);
        document.documentElement.dataset.theme = light ? 'light' : 'dark';
        if (icon) icon.textContent = light ? '☾' : '☀';
        if (text) text.textContent = light ? 'Dark Mode' : 'Light Mode';
        if (toggle) {
            toggle.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
            toggle.setAttribute('aria-pressed', String(light));
        }
        if (persist) write(light ? 'light' : 'dark');
        window.dispatchEvent(new Event('thermpyx:themechange'));
        window.dispatchEvent(new Event('resize'));
    }
    setMode(read() === 'light' ? 'light' : 'dark');
    toggle?.addEventListener('click', () =>
        setMode(body.classList.contains('light-mode') ? 'dark' : 'light', true)
    );
    window.addEventListener('storage', e => {
        if (e.key === key) setMode(e.newValue, false);
    });
    window.addEventListener('pageshow', () => setMode(read(), false));
})();
