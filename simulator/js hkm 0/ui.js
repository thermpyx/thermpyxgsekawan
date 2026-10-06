(() => {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const themeKey = 'thermpyx-theme';

    // Share the same saved preference as the homepage, theory pages and Law 1.
    function readSavedTheme() {
        try {
            return localStorage.getItem(themeKey);
        } catch (_) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(themeKey, theme);
        } catch (_) {
            // The simulation still works if storage is disabled.
        }
    }

    function applyTheme(theme, persist = true) {
        const mode = theme === 'light' ? 'light' : 'dark';
        const dark = mode === 'dark';

        // The Zeroth Law stylesheet uses the 'dark' class. Keep both the
        // root and body in sync, rather than mixing incompatible mode classes.
        document.documentElement.dataset.theme = mode;
        body.classList.toggle('dark', dark);
        body.classList.toggle('light-mode', !dark);

        if (themeToggle) {
            themeToggle.textContent = dark ? '☀ Light Mode' : '✷ Dark Mode';
            themeToggle.setAttribute('aria-label', dark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
            themeToggle.setAttribute('aria-pressed', String(dark));
        }

        if (persist) saveTheme(mode);
        window.dispatchEvent(new Event('resize'));
    }

    applyTheme(readSavedTheme(), false);

    themeToggle?.addEventListener('click', () => {
        const nextTheme = body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(nextTheme);
    });

    // Reflect theme changes made in other open tabs and on back/forward navigation.
    window.addEventListener('storage', event => {
        if (event.key === themeKey) applyTheme(event.newValue, false);
    });
    window.addEventListener('pageshow', () => {
        applyTheme(readSavedTheme(), false);
    });

    /* Custom process selector */
    const processSelector = document.getElementById('processSelector');
    const processSelect = document.getElementById('processSelect');
    const processSelectTrigger = document.getElementById('processSelectTrigger');
    const processSelectCurrent = document.getElementById('processSelectCurrent');
    const processSelectDescription = document.getElementById('processSelectDescription');
    const processOptions = [...document.querySelectorAll('.process-option')];

    function closeProcessSelector() {
        if (!processSelector || !processSelectTrigger) return;
        processSelector.classList.remove('is-open');
        processSelectTrigger.setAttribute('aria-expanded', 'false');
    }

    function openProcessSelector() {
        if (!processSelector || !processSelectTrigger) return;
        processSelector.classList.add('is-open');
        processSelectTrigger.setAttribute('aria-expanded', 'true');
    }

    function syncProcessSelector(value) {
        const option = processOptions.find(item => item.dataset.value === value);
        if (!option) return;

        processOptions.forEach(item => {
            const selected = item === option;
            item.classList.toggle('is-selected', selected);
            item.setAttribute('aria-selected', selected ? 'true' : 'false');
        });

        if (processSelectCurrent) {
            processSelectCurrent.textContent = option.querySelector('span')?.textContent || value;
        }
        if (processSelectDescription) {
            processSelectDescription.textContent = option.dataset.description || '';
        }
    }

    processSelectTrigger?.addEventListener('click', () => {
        if (processSelector?.classList.contains('is-open')) closeProcessSelector();
        else openProcessSelector();
    });

    processOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (!processSelect) return;
            processSelect.value = option.dataset.value;
            syncProcessSelector(processSelect.value);
            processSelect.dispatchEvent(new Event('change', { bubbles: true }));
            closeProcessSelector();
            processSelectTrigger?.focus();
        });
    });

    document.addEventListener('click', event => {
        if (processSelector && !processSelector.contains(event.target)) closeProcessSelector();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeProcessSelector();
    });
    if (processSelect) {
        syncProcessSelector(processSelect.value);
        processSelect.addEventListener('change', () => syncProcessSelector(processSelect.value));
    }
})();