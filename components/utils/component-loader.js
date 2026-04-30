async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

// Update the language switcher link to point to the same page in the other language
function updateLanguageSwitcher() {
    const switchButton = document.querySelector('[data-lang-switch]');
    if (!switchButton) return;

    const targetLang = switchButton.getAttribute('data-lang-switch');
    const currentPath = window.location.pathname;

    let newPath;
    if (targetLang === 'zh') {
        // Going from English to Chinese: add /zh/ at the start
        newPath = '/zh' + currentPath;
    } else {
        // Going from Chinese to English: remove /zh/ from the start
        newPath = currentPath.replace(/^\/zh/, '');
    }

    switchButton.setAttribute('href', newPath);
}

// Initialize mobile navigation
function initMobileNav() {
    const openButton = document.querySelector('.navbar_mobile_open');
    const closeButton = document.querySelector('.navbar_mobile_close');
    const dialog = document.querySelector('.navbar_mobile_menu');
    
    if (openButton && dialog) {
        openButton.addEventListener('click', () => {
            dialog.showModal();
        });
    }
    
    if (closeButton && dialog) {
        closeButton.addEventListener('click', () => {
            dialog.close();
        });
    }
}

// Auto-load components on page load
document.addEventListener('DOMContentLoaded', async function() {
    const headerElement = document.querySelector('[data-header]');
    if (headerElement) {
        const headerName = headerElement.getAttribute('data-header');
        await loadComponent(headerElement.id, `/components/header${headerName}.html`);
        // Initialize mobile nav after header is loaded
        initMobileNav();
        updateLanguageSwitcher();
        // Re-initialize MAST's nav skip-link after dynamically loaded nav
        if (window.initSkipLink) window.initSkipLink();
    }
    
    const footerElement = document.querySelector('[data-footer]');
    if (footerElement) {
        const footerName = footerElement.getAttribute('data-footer');
        await loadComponent(footerElement.id, `/components/footer${footerName}.html`);
    }
});

/* Insert in html
<div id="header-container" data-header=""></div>
<div id="footer-container" data-footer=""></div>
<script src="v2/js/component-loader.js"></script>

For alternate header and footer, 
name file as headerNAME.html and footerNAME.html, and
set data-header="NAME" and data-footer="NAME"
*/