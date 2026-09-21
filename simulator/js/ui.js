(() => {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    function readSavedTheme() {
        try {
            return localStorage.getItem('thermpyx-theme');
        } catch (_) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem('thermpyx-theme', theme);
        } catch (_) {
            // The simulator still works if storage is unavailable.
        }
    }

    function applyTheme(theme) {
        const light = theme === 'light';
        body.classList.toggle('light-mode', light);
        if (themeIcon) themeIcon.textContent = light ? '☀' : '☾';
        if (themeText) themeText.textContent = light ? 'Light Mode' : 'Dark Mode';
        saveTheme(theme);
        window.dispatchEvent(new Event('resize'));
    }

    function toggleTheme() {
        applyTheme(body.classList.contains('light-mode') ? 'dark' : 'light');
    }

    applyTheme(readSavedTheme() || 'dark');
    themeToggle?.addEventListener('click', toggleTheme);


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
