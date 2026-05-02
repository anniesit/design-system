/* Nav */
/* Skip-link accessibility helper. */

//---- Skip to <main> backup if #main anchor link isn't set ----
// Wrapped in a named function so component-loader.js can re-init it
// after dynamically loading the nav HTML.
function initSkipLink() {
  const skipLinkEle = document.getElementById('skip-link');
  if (!skipLinkEle) return;
  skipLinkEle.addEventListener('click', handleSkipLink);
  skipLinkEle.addEventListener('keydown', handleSkipLink);
}

function handleSkipLink(e) {
  if (e.type === 'keydown' && e.key !== 'Enter') return;
  e.preventDefault();
  const target = document.querySelector('main');
  target.setAttribute('tabindex', '-1');
  target.focus();
}

// Auto-init on DOMContentLoaded if the nav is already in the initial HTML
document.addEventListener('DOMContentLoaded', initSkipLink);

// Expose globally so component-loader.js can call it after injecting nav HTML
window.initSkipLink = initSkipLink;


/* Reset mobile nav state when crossing the desktop breakpoint */
// Fixes: layout stays stuck in mobile mode after resizing from <992 back to >=992
// Wrapped in IIFE to avoid re-declaring let wasDesktop if the inline Webflow
// nav script has already declared it in the global lexical scope.
(function () {
  let wasDesktop = window.innerWidth >= 992;
  window.addEventListener('resize', () => {
    const isDesktop = window.innerWidth >= 992;
    if (isDesktop !== wasDesktop) {
      // Crossed the breakpoint — close any open mobile nav
      const navButton = document.querySelector('.w-nav-button.w--open');
      if (navButton) navButton.click(); // triggers Webflow's built-in close logic
      wasDesktop = isDesktop;
    }
  });
})();