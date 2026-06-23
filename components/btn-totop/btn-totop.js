/* Back-to-top Button */
/* Scroll-to-top button with an optional SVG scroll-progress ring. */

/*
 * Markup (data attributes — no IDs/classes required):
 *
 *   <a href="#" data-totop>
 *     <svg viewBox="0 0 36 36">
 *       <path data-totop="track"    d="..."/>   <!-- optional static track -->
 *       <path data-totop="progress" d="..."/>   <!-- optional progress ring -->
 *     </svg>
 *   </a>
 *
 * - [data-totop]            the clickable element (scrolls to top on click)
 * - [data-totop="progress"] the SVG <path> drawn as you scroll (optional)
 *
 * Visibility is exposed via the [data-totop-visible] attribute so it can be
 * styled/animated in CSS (see btn-totop.css). The button is shown once the
 * page is scrolled past the threshold.
 *
 * Config (optional, set before this script runs):
 *   window.DS_CONFIG = { totopThreshold: 0.1 } // 0–1 fraction of page scrolled
 */
(function () {
  "use strict";

  function initBtnToTop() {
    const btn = document.querySelector("[data-totop]");
    if (!btn) return;

    const threshold =
      (window.DS_CONFIG && window.DS_CONFIG.totopThreshold) || 0.1;

    // Optional progress ring — component still works without it.
    const progressBar = btn.querySelector('[data-totop="progress"]');
    let pathLength = 0;
    if (progressBar && typeof progressBar.getTotalLength === "function") {
      pathLength = progressBar.getTotalLength();
      progressBar.style.strokeDasharray = pathLength;
      progressBar.style.strokeDashoffset = pathLength;
    }

    function getScrollPercentage() {
      const scrollTop =
        document.documentElement.scrollTop + document.body.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      return scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    }

    function onScroll() {
      const scrollPercentage = getScrollPercentage();

      if (progressBar && pathLength) {
        progressBar.style.strokeDashoffset =
          pathLength - pathLength * scrollPercentage;
      }

      btn.setAttribute(
        "data-totop-visible",
        scrollPercentage > threshold ? "true" : "false"
      );
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial state

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBtnToTop);
  } else {
    initBtnToTop();
  }
})();
