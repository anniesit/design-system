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
//
// DELIBERATELY EMPTY — do NOT re-add a `navButton.click()` resize handler here.
//
// Webflow's own navbar already closes the mobile menu on resize: its resize
// handler checks whether `.w-nav-button` is still displayed, and when it isn't
// (i.e. we're back on desktop) it runs an immediate close — menu moved back out
// of `.w-nav-overlay`, overlay style cleared, aria-expanded reset.
//
// Clicking the button from our own resize listener RACES that close and loses:
// Webflow's toggle is debounced, so our click executes *after* Webflow has
// already closed the menu. The toggle then sees `open === false` and re-OPENS
// the menu at desktop width, which re-appends it into `.w-nav-overlay`
// (position:absolute; top:100% of the navbar). Result: the desktop menu renders
// displaced below the nav bar, `aria-expanded` is left `true` while `w--open` is
// gone, and the hamburger then needs two clicks to reopen.
//
// Verified against the published site (800px -> 1400px with the menu open):
// with the click removed the menu returns to `.container.cc-nav` at the correct
// desktop position and the overlay is hidden.