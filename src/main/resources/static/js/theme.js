
'use strict';

(function () {

    // ==========================================
    // RAKTASETU DAY / NIGHT MODE
    // Home | Login | Register | Dashboard
    // ==========================================

    const STORAGE_KEY = 'raktasetu-theme';

    // Get saved theme
    function getSavedTheme() {

        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved === 'light' || saved === 'dark') {
                return saved;
            }

        } catch (error) {
            // Storage may be unavailable
        }

        // Use system preference if nothing is saved
        return window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    // Save theme preference
    function saveTheme(theme) {

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            // Theme works even without localStorage
        }
    }

    // Update theme button icon
    function updateButton() {

        const button = document.getElementById('themeToggle');

        if (!button) return;

        const isDark =
            document.documentElement.dataset.theme === 'dark';

        // Show sun in dark mode, moon in light mode
        button.innerHTML = isDark
            ? '<span class="theme-icon" aria-hidden="true">☀️</span>'
            : '<span class="theme-icon" aria-hidden="true">🌙</span>';

        button.setAttribute(
            'aria-label',
            isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'
        );

        button.setAttribute(
            'title',
            isDark ? 'Day Mode' : 'Night Mode'
        );

        button.setAttribute('aria-pressed', String(isDark));
    }

    // Apply theme
    function setTheme(theme) {

        const selectedTheme =
            theme === 'dark' ? 'dark' : 'light';

        document.documentElement.dataset.theme = selectedTheme;

        saveTheme(selectedTheme);

        updateButton();
    }

    // Create and initialize theme button
    function initTheme() {

        const header = document.querySelector('.top');

        if (!header) return;

        let button = document.getElementById('themeToggle');

        // Create button only if it doesn't exist
        if (!button) {

            button = document.createElement('button');

            button.id = 'themeToggle';
            button.type = 'button';
            button.className = 'theme-toggle';

            const navActions = header.querySelector('.navright');
            const logout = header.querySelector('.logout');

            // Home, Login and Register pages
            if (navActions) {

                navActions.prepend(button);

            }

            // Dashboard pages
            else if (logout) {

                logout.before(button);

            }

            // Other pages: place before last header link
            else {

                const headerLinks =
                    header.querySelectorAll('a');

                const lastLink =
                    headerLinks.length > 1
                        ? headerLinks[headerLinks.length - 1]
                        : null;

                if (lastLink) {

                    lastLink.before(button);

                } else {

                    header.appendChild(button);
                }
            }
        }

        // Prevent duplicate event listeners
        if (button.dataset.themeInitialized !== 'true') {

            button.addEventListener('click', function () {

                const current =
                    document.documentElement.dataset.theme;

                const nextTheme =
                    current === 'dark' ? 'light' : 'dark';

                setTheme(nextTheme);
            });

            button.dataset.themeInitialized = 'true';
        }

        updateButton();
    }

    // Apply saved theme immediately
    document.documentElement.dataset.theme = getSavedTheme();

    // Initialize when HTML is ready
    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            initTheme
        );

    } else {

        initTheme();
    }

})();
