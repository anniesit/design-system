/* TOC Scroll-To */
/*
 * One component for the whole table-of-contents pattern:
 *
 *   1. Offset scroll  — every in-page hash link scrolls with the sticky nav
 *                       (and the collapsed TOC bar on mobile) accounted for.
 *   2. Scroll-spy     — highlights the TOC link for the section you're in.
 *   3. Mobile dropdown — below `tocBreakpoint` the TOC collapses behind a
 *                       trigger button, animated via the `.is-closed` class.
 *
 * Replaces components/utils/toc-scrollto-offset.js and the per-page footer
 * scroll-spy snippets. Those ran as separate handlers and fought each other:
 * the page snippet had to use capture-phase + stopPropagation just to stop the
 * global hash handler from firing a second, un-offset scroll. Here a single
 * delegated handler owns every hash click, so no suppression is needed.
 *
 * Expected markup (classes are the defaults; see SELECTORS to override):
 *
 *   <nav class="toc-wrap" aria-label="On this page">
 *     <button class="toc-trigger">Table of Contents <i class="ph ph-caret-down"></i></button>
 *     <ul class="toc is-closed">
 *       <li class="toc-item"><a href="#section-id" class="toc-link">Section</a></li>
 *     </ul>
 *   </nav>
 *
 * CSS contract (all set in Webflow, not here):
 *   .toc-trigger          display:none on desktop, display:flex at/below the breakpoint
 *   .toc                  overflow:hidden + a transition on height (or max-height)
 *   .toc.is-closed        height:0 at/below the breakpoint
 *
 * Config (window.DS_CONFIG, set before all.js loads):
 *   tocBreakpoint   992   px width below which the TOC becomes a dropdown
 *   tocScrollGap      8   px breathing room between the nav and the target
 */
(function () {
  "use strict";

  var CFG = window.DS_CONFIG || {};
  var BREAKPOINT = CFG.tocBreakpoint || 992;
  var GAP = CFG.tocScrollGap != null ? CFG.tocScrollGap : 8;
  var SPY_GAP = 8; // spy line sits just below the scroll landing line, so the
  // section you just jumped to reads as active without flickering.

  var CLOSED = "is-closed";

  // Legacy names (.toc_list etc.) are kept as fallbacks so older projects
  // built before the current naming can adopt this file unchanged.
  var SELECTORS = {
    nav: ".nav",
    wrap: "[data-toc], .toc-wrap",
    trigger: "[data-toc-trigger], .toc-trigger, .toc_trigger",
    list: "[data-toc-list], .toc, .toc_list",
    link: "a.toc-link, a.link_subnav",
    icon: "[data-toc-icon], .icon_toc_trigger, [class*='caret']"
  };

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  function prefersReducedMotion() {
    return !!(reduceMotion && reduceMotion.matches);
  }

  function isMobile() {
    return window.innerWidth < BREAKPOINT;
  }

  /* ---------------------------------------------------------------- offsets */

  function navHeight() {
    var nav = document.querySelector(SELECTORS.nav);
    return nav ? nav.offsetHeight : 0;
  }

  // How far from the top of the viewport a scroll target must land to clear
  // everything pinned above it: the nav, plus the collapsed TOC bar when it is
  // stuck on mobile (offsetParent is null while the trigger is display:none).
  function scrollOffset() {
    var offset = navHeight();

    var trigger = document.querySelector(SELECTORS.trigger);
    if (trigger && trigger.offsetParent !== null) {
      var wrap = trigger.closest(SELECTORS.wrap) || trigger.parentElement;
      var stickyTop = 0;
      if (wrap && getComputedStyle(wrap).position === "sticky") {
        stickyTop = parseFloat(getComputedStyle(wrap).top) || 0;
      }
      offset = Math.max(offset, stickyTop + trigger.offsetHeight);
    }

    return offset + GAP;
  }

  function scrollToTarget(target) {
    // Deferred a frame: a TOC collapsing on the same click changes page height,
    // so measure after the layout settles.
    requestAnimationFrame(function () {
      var top = target.getBoundingClientRect().top + window.scrollY - scrollOffset();
      window.scrollTo({
        top: top < 0 ? 0 : top,
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    });
  }

  function targetOf(link) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#" || href === "#") return null;
    try {
      return document.querySelector(href);
    } catch (err) {
      return null; // href isn't a valid selector (e.g. "#1")
    }
  }

  /* -------------------------------------------------------------- dropdown */

  function Dropdown(wrap) {
    this.wrap = wrap;
    this.trigger = wrap.querySelector(SELECTORS.trigger);
    this.list = wrap.querySelector(SELECTORS.list);
    this.icon = this.trigger && this.trigger.querySelector(SELECTORS.icon);
    this.timer = null;
  }

  // The CSS decides whether it animates height or max-height; follow its lead
  // so both the current and the legacy stylesheets work untouched.
  Dropdown.prototype.animProp = function () {
    var declared = getComputedStyle(this.list).transitionProperty || "";
    return declared.indexOf("max-height") > -1 ? "maxHeight" : "height";
  };

  Dropdown.prototype.isOpen = function () {
    return !this.list.classList.contains(CLOSED);
  };

  Dropdown.prototype.setIcon = function (open) {
    if (!this.icon) return;
    if (!this.icon.style.transition && getComputedStyle(this.icon).transitionProperty === "all") {
      this.icon.style.transition = "transform 300ms ease-in-out";
    }
    this.icon.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
  };

  // Height transitions need two concrete endpoints — `auto` won't animate — so
  // pin an explicit pixel height, force a reflow, then move to the other end.
  Dropdown.prototype.animate = function (from, to, done) {
    var prop = this.animProp();
    var list = this.list;

    clearTimeout(this.timer);

    if (prefersReducedMotion()) {
      list.style[prop] = to;
      if (done) done();
      return;
    }

    list.style[prop] = from;
    void list.offsetHeight; // flush the starting value before changing it
    list.style[prop] = to;

    var duration = (parseFloat(getComputedStyle(list).transitionDuration) || 0) * 1000;
    this.timer = setTimeout(function () {
      if (done) done();
    }, duration + 50);
  };

  Dropdown.prototype.open = function () {
    var list = this.list;
    var prop = this.animProp();

    list.classList.remove(CLOSED);
    this.animate("0px", list.scrollHeight + "px", function () {
      // Back to auto so the list can reflow if its content or width changes.
      list.style[prop] = "";
    });

    if (this.trigger) this.trigger.setAttribute("aria-expanded", "true");
    this.setIcon(true);
  };

  Dropdown.prototype.close = function () {
    var list = this.list;
    list.classList.add(CLOSED);
    // The inline 0px stays put: legacy stylesheets have no `.is-closed` rule to
    // hold the collapsed state, and on desktop reset() clears it anyway.
    this.animate(list.scrollHeight + "px", "0px");

    if (this.trigger) this.trigger.setAttribute("aria-expanded", "false");
    this.setIcon(false);
  };

  Dropdown.prototype.toggle = function () {
    this.isOpen() ? this.close() : this.open();
  };

  // Desktop: hand every inline style back to the stylesheet. `.is-closed` is
  // inert above the breakpoint, so it can stay on the element.
  Dropdown.prototype.reset = function () {
    clearTimeout(this.timer);
    this.list.style.height = "";
    this.list.style.maxHeight = "";
    if (this.trigger) this.trigger.removeAttribute("aria-expanded");
    if (this.icon) this.icon.style.transform = "";
  };

  Dropdown.prototype.init = function () {
    var self = this;
    if (!this.trigger || !this.list) return;

    if (!this.trigger.hasAttribute("type")) this.trigger.setAttribute("type", "button");
    if (this.list.id) this.trigger.setAttribute("aria-controls", this.list.id);

    this.trigger.addEventListener("click", function (e) {
      e.preventDefault();
      if (isMobile()) self.toggle();
    });

    this.applyBreakpoint();
  };

  Dropdown.prototype.applyBreakpoint = function () {
    if (!this.trigger || !this.list) return;
    if (isMobile()) {
      this.list.classList.add(CLOSED);
      this.list.style.height = "";
      this.list.style.maxHeight = "";
      this.trigger.setAttribute("aria-expanded", "false");
      this.setIcon(false);
    } else {
      this.reset();
    }
  };

  /* ------------------------------------------------------------ scroll-spy */

  function Spy(wrap) {
    this.links = [].slice.call(wrap.querySelectorAll(SELECTORS.link));
    this.sections = this.links.map(targetOf);
  }

  Spy.prototype.update = function () {
    var line = scrollOffset() + SPY_GAP;
    var active = -1;

    for (var i = 0; i < this.sections.length; i++) {
      if (this.sections[i] && this.sections[i].getBoundingClientRect().top <= line) active = i;
    }

    // Pin the last item once the page bottom is reached — short trailing
    // sections never clear the line on their own.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      active = this.sections.length - 1;
    }

    for (var j = 0; j < this.links.length; j++) {
      this.links[j].classList.toggle("w--current", j === active);
    }
  };

  Spy.prototype.init = function () {
    if (!this.links.length) return;

    // Opt these links out of Webflow's built-in (viewport-middle) "current"
    // detection so this top-anchored spy is the single source of truth.
    this.links.forEach(function (link) {
      link.setAttribute("hreflang", "en");
    });

    this.update();
  };

  /* ------------------------------------------------------------------ init */

  function init() {
    var wraps = [].slice.call(document.querySelectorAll(SELECTORS.wrap));
    var dropdowns = [];
    var spies = [];

    wraps.forEach(function (wrap) {
      var dropdown = new Dropdown(wrap);
      dropdown.init();
      dropdowns.push(dropdown);

      var spy = new Spy(wrap);
      spy.init();
      spies.push(spy);
    });

    // One delegated handler for every in-page hash link — TOC links and loose
    // ones alike. Capture phase + stopPropagation keeps Webflow's own hash
    // scroll from running a second, un-offset scroll on top of ours.
    document.addEventListener(
      "click",
      function (e) {
        var link = e.target.closest && e.target.closest('a[href^="#"]');
        if (!link) return;

        var target = targetOf(link);
        if (!target) return; // "#" placeholders, tabs, dropdowns — leave alone

        e.preventDefault();
        e.stopPropagation();

        // A TOC link on mobile collapses the dropdown as it jumps.
        if (isMobile() && link.matches(SELECTORS.link)) {
          dropdowns.forEach(function (dropdown) {
            if (dropdown.list && dropdown.list.contains(link) && dropdown.isOpen()) {
              dropdown.close();
            }
          });
        }

        scrollToTarget(target);
      },
      true
    );

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        spies.forEach(function (spy) {
          spy.update();
        });
        ticking = false;
      });
    }

    if (spies.length) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    var wasMobile = isMobile();
    window.addEventListener(
      "resize",
      function () {
        var nowMobile = isMobile();
        if (nowMobile !== wasMobile) {
          wasMobile = nowMobile;
          dropdowns.forEach(function (dropdown) {
            dropdown.applyBreakpoint();
          });
        }
        onScroll();
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
