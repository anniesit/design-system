/* Global JS */
/* Site-wide JavaScript: accessibility helpers and small utilities */

// ---- Detect default and mark default font size increase (for accessibility) ----
(function() {
  function detectFontSizeIncrease() {
    // Get the root font size in pixels
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    // Default is typically 16px
    const defaultSize = 16;
    const multiplier = rootFontSize / defaultSize;
    // Add or remove class based on multiplier
    if (multiplier >= 2) {
      document.body.classList.add('font-size-increased');
    } else {
      document.body.classList.remove('font-size-increased');
    }
  }
  // Run on load
  detectFontSizeIncrease();
  // Watch for changes (when user adjusts font size)
  const observer = new ResizeObserver(() => {
    detectFontSizeIncrease();
  });
  observer.observe(document.documentElement);
})();

  // ---- Update foot year to current year ----
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-footer-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Handle aria-current="page"
  const currentPath = window.location.pathname;
  const currentOrigin = window.location.origin;

  // Nav links + footer logo — same pathname logic
  document.querySelectorAll('nav a[href], .footer-logo_link').forEach(function(link) {
    try {
      const linkPath = new URL(link.href, currentOrigin).pathname;
      if (linkPath === currentPath) {
        link.setAttribute('aria-current', 'page');
      }
    } catch (e) {
      // Skip unparseable hrefs (tel:, mailto:, javascript:, etc.)
    }
  });
});

