/* TOC Scroll-To */
/*
 * One component for the whole table-of-contents pattern:
 *
 *   1. Offset scroll  — every in-page hash link scrolls with the sticky nav
 *                       (and the collapsed TOC bar on mobile) accounted for.
 *   2. Scroll-spy     — highlights the TOC link for the section you're in.
 *   3. Mobile dropdown — below `tocBreakpoint` the TOC collapses behind a
 *                       trigger button, animated via the `.is-closed` class.
 *   4. Live label     — the collapsed trigger shows the section you're reading
 *                       instead of a static "Table of Contents".
 *
 * Opening or closing the list reflows everything below it, which is why two
 * things here look more defensive than they should need to be:
 *
 *   - While the sticky bar is pinned, the reflow happens above the reader, so
 *     the article would jump by the full height of the list. A per-frame hold
 *     pins it. It corrects an anchor element's observed drift rather than the
 *     list's height, because Chrome sometimes absorbs the reflow via scroll
 *     anchoring and Safari never does — so "scroll by the height change" is
 *     right on some browsers and doubles the error on others.
 *   - A TOC link collapses the list instantly rather than animating, so layout
 *     has settled before the scroll destination is measured. Smooth scrolling
 *     locks its destination in up front; a still-animating collapse would drag
 *     the target up past the nav after we had aimed at it.
 *
 * Replaces components/utils/toc-scrollto-offset.js and the per-page footer
 * scroll-spy snippets. Those ran as separate handlers and fought each other:
 * the page snippet had to use capture-phase + stopPropagation just to stop the
 * global hash handler from firing a second, un-offset scroll. Here a single
 * delegated handler owns every hash click, so no suppression is needed.
 *
 * ---------------------------------------------------------------------------
 * HOOKS
 * ---------------------------------------------------------------------------
 * Every element resolves data-attribute first, class second — use either. Prefer
 * data-* for behaviour and leave classes for styling: a class rename in
 * Webflow's Style panel then can't silently break the JS. Legacy class names
 * (.toc_list etc.) are kept so older projects work unchanged.
 *
 *   Element         data-* hook         class fallback           Needed for
 *   -------------------------------------------------------------------------
 *   sticky nav      data-toc-nav        .nav                     scroll offset
 *   TOC root        data-toc            .toc-wrap                everything
 *   trigger button  data-toc-trigger    .toc-trigger             dropdown
 *                                       .toc_trigger
 *   the list        data-toc-list       .toc / .toc_list         dropdown
 *   TOC links       data-toc-link       a.toc-link               spy + label
 *                                       a.link_subnav
 *   caret icon      data-toc-icon       .icon_toc_trigger        caret rotation
 *                                       [class*="caret"]
 *   trigger label   data-toc-label      .toc-trigger-label       live label
 *
 *   Tabbed mode (optional — switches on only when a data-toc-tab exists):
 *   tab button      data-toc-tab="id"   —                        panel switch
 *   tab group       data-toc-group      .toc-group               active state
 *   tab sub-list    data-toc-sub        .toc-sub                 collapse
 *   panel           data-toc-panel      —                        (on the panel, id = tab value)
 *
 * All are optional except the TOC root — the script degrades feature by feature.
 * No nav found means a zero offset; no trigger/list means a plain static TOC;
 * no links means no spy. Offset scrolling for loose hash links works even on
 * pages with no TOC at all.
 *
 * Language: every TOC link gets an hreflang (it is what stops Webflow's own
 * "current link" script competing with the spy). The value is the language of
 * the section the link points to — the nearest [lang] on or above it, else
 * <html lang> — so EN, TC and bilingual pages need no setting. On a bilingual
 * page, put lang="en" (or "zh-HK") on each section or panel in the other
 * language. To force a value, add an hreflang custom attribute to the link in
 * the Designer; the script never overwrites one.
 *
 * The label is auto-detected (first child of the trigger that isn't the caret,
 * or a bare text node), so `data-toc-label` is only needed for more complex
 * trigger markup. Its markup text is the resting label, restored above the
 * first section.
 *
 * Expected markup:
 *
 *   <nav class="toc-wrap" aria-label="On this page">
 *     <button class="toc-trigger">
 *       <div>Table of Contents</div>          <- becomes the live label
 *       <i class="ph ph-caret-down"></i>
 *     </button>
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
 * ---------------------------------------------------------------------------
 * TABBED MODE
 * ---------------------------------------------------------------------------
 * For long pages split into panels (a user guide): the top level of the TOC
 * switches which panel is shown, the level under it scrolls within the panel.
 *
 *   <nav class="toc-wrap" data-toc aria-label="On this page">
 *     <button class="toc-trigger">…</button>
 *     <ul class="toc is-closed">
 *       <li class="toc-group">
 *         <button data-toc-tab="reading">Reading</button>
 *         <ul class="toc-sub">
 *           <li><a href="#book-page" class="toc-link">Book page</a></li>
 *         </ul>
 *       </li>
 *     </ul>
 *   </nav>
 *   <section id="reading" data-toc-panel> <h2>…</h2> <section id="book-page">…
 *
 * What the script does:
 *   - Shows one panel at a time (the `hidden` attribute on the others) and
 *     opens only the active group's sub-list. The active group also gets
 *     `.is-active` for styling. Tab buttons get aria-controls, aria-current
 *     and aria-expanded (whether their panel is shown); panels become labelled
 *     regions. This is deliberately NOT the ARIA tabs pattern — that pattern
 *     cannot contain the nested links.
 *   - A tab click shows its panel, scrolls to the panel top, closes the mobile
 *     dropdown and pushes #panel-id to the address bar (so Back works).
 *   - Any hash link or URL hash pointing INTO a hidden panel switches to that
 *     panel first, then scrolls — the target is measured only once visible.
 *   - Scroll-spy ignores headings with no layout (inside hidden panels).
 *   - The collapsed trigger's resting label becomes the active tab's name.
 * Without JS every panel stays visible, stacked — readable and indexable.
 *
 * Config (window.DS_CONFIG, set before design-system.js loads):
 *   tocBreakpoint   992   px width below which the TOC becomes a dropdown
 *   tocScrollGap      8   px breathing room between the nav and the target
 *   tocTabFade      180   ms for each half of a tabbed-mode panel switch
 *                         (fade out, then fade in); 0 = instant
 */
(function () {
  "use strict";

  var CFG = window.DS_CONFIG || {};
  var BREAKPOINT = CFG.tocBreakpoint || 992;
  var GAP = CFG.tocScrollGap != null ? CFG.tocScrollGap : 8;
  var SPY_GAP = 8; // spy line sits just below the scroll landing line, so the
  // section you just jumped to reads as active without flickering.

  var CLOSED = "is-closed";
  // Tabbed mode: each half of a panel switch (fade out, then fade in), in ms.
  var TAB_FADE = CFG.tocTabFade != null ? CFG.tocTabFade : 180;

  // See the HOOKS table at the top of this file. Data-attribute first, class
  // second; the trailing legacy names let pre-rename projects work unchanged.
  var SELECTORS = {
    nav: "[data-toc-nav], .nav",
    wrap: "[data-toc], .toc-wrap",
    trigger: "[data-toc-trigger], .toc-trigger, .toc_trigger",
    list: "[data-toc-list], .toc, .toc_list",
    link: "[data-toc-link], a.toc-link, a.link_subnav",
    icon: "[data-toc-icon], .icon_toc_trigger, [class*='caret']",
    label: "[data-toc-label], .toc-trigger-label",
    tab: "[data-toc-tab]",
    group: "[data-toc-group], .toc-group",
    sub: "[data-toc-sub], .toc-sub",
    panel: "[data-toc-panel]",
  };

  // Hidden elements (display:none, or inside a hidden panel) have no boxes, so
  // their getBoundingClientRect() is all zeros — which reads as "scrolled past".
  function isRendered(el) {
    return !!el && el.getClientRects().length > 0;
  }

  var reduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function prefersReducedMotion() {
    return !!(reduceMotion && reduceMotion.matches);
  }

  function isMobile() {
    return window.innerWidth < BREAKPOINT;
  }

  // global/normalized.css sets `html { scroll-behavior: smooth }`, so a bare
  // scrollBy() gets animated — and a per-frame correction would cancel its own
  // previous animation each frame, landing about a third of the distance.
  // Corrections must say "instant" explicitly.
  function scrollByInstant(delta) {
    try {
      window.scrollBy({ top: delta, left: 0, behavior: "instant" });
    } catch (err) {
      window.scrollBy(0, delta); // browsers predating the "instant" keyword
    }
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

  // Measured a frame late so any dropdown collapsing on the same click has
  // already been committed to layout — smooth scrolling locks in its
  // destination up front, so the target must not still be moving.
  // opts.instant — jump without animating (restoring a URL hash on load).
  function scrollToTarget(target, opts) {
    requestAnimationFrame(function () {
      var top = target.getBoundingClientRect().top + window.scrollY - scrollOffset();
      window.scrollTo({
        top: top < 0 ? 0 : top,
        behavior: (opts && opts.instant) || prefersReducedMotion() ? "instant" : "smooth",
      });
    });
  }

  function targetOfHash(hash) {
    if (!hash || hash === "#") return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (err) {
      return null; // malformed percent-encoding
    }
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
    this.releaseHold = null;
    this.label = this.findLabel();
    // Whatever the label says in the markup ("Table of Contents") becomes the
    // resting state, shown above the first section and at the top of the page.
    this.defaultLabel = this.label ? this.label.textContent.trim() : "";
    this.timer = null;
  }

  // The label is the text node holder inside the trigger. Prefer an explicit
  // hook; otherwise take the first child that isn't the caret, so the common
  // `<button><div>Table of Contents</div><i class="ph ph-caret-down"></i></button>`
  // works with no extra markup.
  Dropdown.prototype.findLabel = function () {
    if (!this.trigger) return null;

    var explicit = this.trigger.querySelector(SELECTORS.label);
    if (explicit) return explicit;

    var children = this.trigger.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child === this.icon) continue;
      if (this.icon && child.contains(this.icon)) continue;
      return child;
    }

    // No element wrapper — the label is a bare text node sitting next to the
    // caret. Text nodes support textContent too, so setLabel works unchanged
    // and the caret beside it survives.
    var nodes = this.trigger.childNodes;
    for (var j = 0; j < nodes.length; j++) {
      if (nodes[j].nodeType === 3 && nodes[j].textContent.trim()) return nodes[j];
    }

    return null;
  };

  // Mirrors the section you're currently reading. Passing null restores the
  // resting label.
  Dropdown.prototype.setLabel = function (text) {
    if (!this.label) return;
    var next = text || this.defaultLabel;
    if (this.label.textContent !== next) this.label.textContent = next;
  };

  Dropdown.prototype.height = function () {
    return this.list.getBoundingClientRect().height;
  };

  // True while the sticky wrap is pinned — the page has scrolled past its
  // natural position, so the list's flow box sits above the viewport.
  Dropdown.prototype.isStuck = function () {
    var cs = getComputedStyle(this.wrap);
    if (cs.position !== "sticky") return false;
    return this.wrap.getBoundingClientRect().top <= (parseFloat(cs.top) || 0) + 0.5;
  };

  // Opening or closing the list reflows everything after it. While the bar is
  // pinned that reflow happens *above* the reader, so the article slides out
  // from under them by the full height of the list. Follow the height frame by
  // frame and scroll by the same delta to hold the reading position still.
  //
  // Only while pinned: if the TOC is on screen in its natural spot, pushing the
  // article down is exactly what a dropdown should do. Returns a stop function.
  Dropdown.prototype.holdScroll = function () {
    if (!this.isStuck()) return null;

    // Hold a real element still rather than tracking the list's height. Chrome's
    // scroll anchoring sometimes absorbs the reflow on its own and Safari never
    // does, so "scroll by however much the list grew" is right only on some
    // browsers. Correcting the anchor's observed drift is right on all of them:
    // whatever else moved the page, we only fix what's left over.
    var anchor = this.wrap.nextElementSibling || this.wrap.parentElement;
    if (!anchor) return null;

    var hold = anchor.getBoundingClientRect().top;
    var live = true;

    (function frame() {
      if (!live) return;

      var drift = anchor.getBoundingClientRect().top - hold;
      if (Math.abs(drift) >= 0.5) {
        var before = window.scrollY;
        scrollByInstant(drift);
        // Hit the top or bottom of the document — accept the new position
        // instead of retrying the same correction every frame.
        if (window.scrollY === before) hold = anchor.getBoundingClientRect().top;
      }

      requestAnimationFrame(frame);
    })();

    return function () {
      live = false;
    };
  };

  Dropdown.prototype.stopHold = function () {
    if (this.releaseHold) {
      this.releaseHold();
      this.releaseHold = null;
    }
  };

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
      // One frame's grace so any active scroll hold sees the instant jump
      // before it is released.
      if (done) requestAnimationFrame(done);
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

  // opts.compensate — pass false when the caller is deliberately moving the
  // page (a TOC link click), so the hold doesn't fight the scroll.
  Dropdown.prototype.open = function (opts) {
    var self = this;
    var list = this.list;
    var prop = this.animProp();

    this.stopHold();
    if (!opts || opts.compensate !== false) this.releaseHold = this.holdScroll();

    list.classList.remove(CLOSED);
    this.animate("0px", list.scrollHeight + "px", function () {
      // Back to auto so the list can reflow if its content or width changes.
      list.style[prop] = "";
      self.stopHold();
    });

    if (this.trigger) this.trigger.setAttribute("aria-expanded", "true");
    this.setIcon(true);
  };

  // opts.instant — collapse with no transition, layout settled before we
  // return. Used when the caller needs to measure the page straight after.
  Dropdown.prototype.close = function (opts) {
    var self = this;
    var list = this.list;

    this.stopHold();

    // The inline 0px stays put: legacy stylesheets have no `.is-closed` rule to
    // hold the collapsed state, and on desktop reset() clears it anyway.
    if (opts && opts.instant) {
      clearTimeout(this.timer);
      var previous = list.style.transition;
      list.style.transition = "none";
      list.classList.add(CLOSED);
      list.style[this.animProp()] = "0px";
      void list.offsetHeight; // commit the collapse before the transition returns
      list.style.transition = previous;
    } else {
      if (!opts || opts.compensate !== false) this.releaseHold = this.holdScroll();
      list.classList.add(CLOSED);
      this.animate(list.scrollHeight + "px", "0px", function () {
        self.stopHold();
      });
    }

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
    this.active = null; // null (not -1) so the first update always reports
    this.onChange = null;
  }

  Spy.prototype.update = function () {
    var line = scrollOffset() + SPY_GAP;
    var active = -1;
    var lastRendered = -1;

    // Skip sections with no layout: in tabbed mode the other panels' headings
    // are hidden, and a hidden element's rect top of 0 would read as "passed".
    for (var i = 0; i < this.sections.length; i++) {
      var section = this.sections[i];
      if (!isRendered(section)) continue;
      lastRendered = i;
      if (section.getBoundingClientRect().top <= line) active = i;
    }

    // Pin the last visible item once the page bottom is reached — short
    // trailing sections never clear the line on their own.
    if (lastRendered > -1 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      active = lastRendered;
    }

    for (var j = 0; j < this.links.length; j++) {
      this.links[j].classList.toggle("w--current", j === active);
    }

    if (active !== this.active) {
      this.active = active;
      if (this.onChange) this.onChange(active > -1 ? this.links[active] : null);
    }
  };

  Spy.prototype.init = function () {
    if (!this.links.length) return;

    // Opt these links out of Webflow's built-in (viewport-middle) "current"
    // detection so this top-anchored spy is the single source of truth.
    // Webflow's links module skips any link that HAS an hreflang, whatever its
    // value. The value is still read as "the language of the link's target",
    // so each link takes the language of the section it points to: the
    // nearest [lang] on or above that section, which falls back to <html lang>.
    // EN, TC and bilingual pages all come out right with no setting — on a
    // bilingual page, tag the English sections lang="en" and their links
    // follow. An hreflang set on the link in the Designer always wins.
    // "und" (undetermined) is the valid value when nothing declares one.
    var sections = this.sections;
    this.links.forEach(function (link, i) {
      if (link.hasAttribute("hreflang")) return;
      var target = sections[i];
      var owner = target && target.closest("[lang]");
      var lang = (owner && owner.getAttribute("lang")) ||
        document.documentElement.getAttribute("lang") || "und";
      link.setAttribute("hreflang", lang);
    });

    this.update();
  };

  // Re-report even if the active index is unchanged (a tab switch changes what
  // "nothing active" should read as).
  Spy.prototype.refresh = function () {
    this.active = null;
    this.update();
  };

  /* ------------------------------------------------------------ tabbed mode */

  function Tabs(wrap) {
    this.tabs = [].slice.call(wrap.querySelectorAll(SELECTORS.tab));
    this.active = null;
    this.onChange = null;
  }

  Tabs.prototype.panelOf = function (tab) {
    var id = tab.getAttribute("data-toc-tab");
    return id ? document.getElementById(id) : null;
  };

  Tabs.prototype.groupOf = function (tab) {
    return tab.closest(SELECTORS.group) || tab.parentElement;
  };

  Tabs.prototype.subOf = function (tab) {
    var group = this.groupOf(tab);
    return group ? group.querySelector(SELECTORS.sub) : null;
  };

  Tabs.prototype.tabForPanel = function (panel) {
    for (var i = 0; i < this.tabs.length; i++) {
      if (this.panelOf(this.tabs[i]) === panel) return this.tabs[i];
    }
    return null;
  };

  // The tab owning an element: the panel it sits in (or is).
  Tabs.prototype.tabFor = function (el) {
    var panel = el && el.closest(SELECTORS.panel);
    return panel ? this.tabForPanel(panel) : null;
  };

  function fadeMs() {
    return prefersReducedMotion() ? 0 : TAB_FADE;
  }

  // Opacity fades use the Web Animations API, so no stylesheet has to supply a
  // transition. fill:"forwards" holds the faded-out state until the caller has
  // hidden the element — otherwise it would flash back to full opacity for a
  // frame before `hidden` lands.
  function fade(el, from, to, done) {
    var ms = fadeMs();
    if (!ms || !el.animate) {
      if (done) done();
      return null;
    }
    var anim = el.animate([{ opacity: from }, { opacity: to }], {
      duration: ms,
      easing: "ease-in-out",
      fill: "forwards",
    });
    anim.onfinish = function () {
      if (done) done();
      anim.cancel(); // drop the held opacity; the element's own styles resume
    };
    return anim;
  }

  // Update the TOC side at once (it is what the user just clicked), then fade
  // the old panel out, swap panels, and fade the new one in. `done` runs right
  // after the swap — the moment the new panel has layout and can be scrolled
  // to — even when nothing changed. Returns true when the panel changes.
  Tabs.prototype.activate = function (tab, done) {
    if (!tab || tab === this.active) {
      if (done) done();
      return false;
    }

    var self = this;
    var previous = this.active ? this.panelOf(this.active) : null;
    var seq = (this.seq = (this.seq || 0) + 1);
    this.active = tab;

    for (var i = 0; i < this.tabs.length; i++) {
      var t = this.tabs[i];
      var on = t === tab;
      var group = this.groupOf(t);
      var sub = this.subOf(t);

      if (group && group !== t) group.classList.toggle("is-active", on);
      if (sub) sub.hidden = !on;
      // Every tab shows or hides its panel (and its sub-list, if any), so
      // every tab that has a panel reports it — not only tabs with a sub-list.
      if (sub || this.panelOf(t)) t.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) t.setAttribute("aria-current", "true");
      else t.removeAttribute("aria-current");
    }

    function swap() {
      if (seq !== self.seq) return; // a later click already took over
      var shown = null;
      for (var j = 0; j < self.tabs.length; j++) {
        var panel = self.panelOf(self.tabs[j]);
        if (!panel) continue;
        panel.hidden = self.tabs[j] !== self.active;
        if (!panel.hidden) shown = panel;
      }
      if (self.onChange) self.onChange(tab);
      if (done) done();
      if (shown && previous) fade(shown, 0, 1);
    }

    // First activation (page load) swaps instantly: nothing to fade from.
    if (previous && isRendered(previous)) fade(previous, 1, 0, swap);
    else swap();
    return true;
  };

  // Switch to the panel an element lives in, if it isn't the visible one.
  Tabs.prototype.reveal = function (el, done) {
    var tab = this.tabFor(el);
    if (tab) return this.activate(tab, done);
    if (done) done();
    return false;
  };

  Tabs.prototype.init = function () {
    var self = this;

    this.tabs.forEach(function (tab) {
      if (tab.tagName === "BUTTON" && !tab.hasAttribute("type")) tab.setAttribute("type", "button");
      var panel = self.panelOf(tab);
      if (!panel) return;
      tab.setAttribute("aria-controls", panel.id);
      if (!panel.hasAttribute("role")) panel.setAttribute("role", "region");
      if (!panel.hasAttribute("aria-label") && !panel.hasAttribute("aria-labelledby")) {
        panel.setAttribute("aria-label", tab.textContent.trim());
      }
    });

    // Start on the panel the URL points into, else the first one.
    var fromHash = this.tabFor(targetOfHash(window.location.hash));
    this.activate(fromHash || this.tabs[0]);
  };

  /* ------------------------------------------------------------------ init */

  function init() {
    var wraps = [].slice.call(document.querySelectorAll(SELECTORS.wrap));
    var dropdowns = [];
    var spies = [];
    var tabSets = [];

    wraps.forEach(function (wrap) {
      var dropdown = new Dropdown(wrap);
      dropdown.init();
      dropdowns.push(dropdown);

      // The collapsed trigger doubles as a "you are here" readout: it shows the
      // current section's TOC text, falling back to its own markup label.
      var spy = new Spy(wrap);
      spy.onChange = function (link) {
        dropdown.setLabel(link ? link.textContent.trim() : null);
      };

      // Tabbed mode: panels must be switched before the spy first measures.
      if (wrap.querySelector(SELECTORS.tab)) {
        var tabs = new Tabs(wrap);
        tabs.wrap = wrap;
        tabs.dropdown = dropdown;
        tabs.onChange = function (tab) {
          // Above the first sub-section, the trigger names the active tab.
          dropdown.defaultLabel = tab.textContent.trim();
          if (spy.links) spy.refresh();
        };
        tabs.init();
        tabSets.push(tabs);
      }

      spy.init();
      spies.push(spy);
    });

    // Tab buttons: show the panel, jump to its top, record it in the URL.
    // Registered before the hash-link handler; the two never match the same
    // element (a tab is a button, not an a[href^="#"]).
    if (tabSets.length) {
      document.addEventListener("click", function (e) {
        var tab = e.target.closest && e.target.closest(SELECTORS.tab);
        if (!tab) return;
        var set = null;
        tabSets.forEach(function (s) {
          if (s.tabs.indexOf(tab) > -1) set = s;
        });
        if (!set) return;

        e.preventDefault();

        // Choosing a tab is a destination in itself, so the mobile dropdown
        // closes — instantly, for the same reason TOC links do below.
        if (isMobile() && set.dropdown.list && set.dropdown.isOpen()) {
          set.dropdown.close({ compensate: false, instant: true });
        }

        var panel = set.panelOf(tab);
        if (panel && window.history && history.pushState && window.location.hash !== "#" + panel.id) {
          history.pushState(null, "", "#" + panel.id);
        }
        // Scroll once the new panel is in place (after the fade-out).
        set.activate(tab, function () {
          if (panel) scrollToTarget(panel);
        });
      });

      // Back/Forward (and hand-edited URLs) between panels and sub-sections.
      window.addEventListener("hashchange", function () {
        var target = targetOfHash(window.location.hash);
        tabSets.forEach(function (set) {
          if (target) {
            set.reveal(target, function () {
              scrollToTarget(target);
            });
          } else {
            set.activate(set.tabs[0], function () {
              window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "instant" : "smooth" });
            });
          }
        });
      });

      // The browser already tried to jump to the URL hash before the other
      // panels were hidden, so re-aim at it now that layout is final.
      var initial = targetOfHash(window.location.hash);
      if (initial) scrollToTarget(initial, { instant: true });
    }

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

        // A TOC link on mobile collapses the dropdown as it jumps. Collapse it
        // instantly and without the scroll hold, so the page has already
        // settled — including any scroll anchoring the browser applied — before
        // scrollToTarget measures. Animating here instead would leave the
        // target moving while the smooth scroll aimed at a stale position.
        if (isMobile() && link.matches(SELECTORS.link)) {
          dropdowns.forEach(function (dropdown) {
            if (dropdown.list && dropdown.list.contains(link) && dropdown.isOpen()) {
              dropdown.close({ compensate: false, instant: true });
            }
          });
        }

        // Tabbed mode: a target inside a hidden panel has no position yet.
        // Switch panels first; scroll only once it is visible.
        var owner = null;
        tabSets.forEach(function (set) {
          if (set.tabFor(target)) owner = set;
        });
        if (owner) {
          // Keep the address bar pointing at what is on screen, so a reload
          // or a shared link opens the same panel (not the last tab clicked).
          if (target.id && window.history && history.pushState && window.location.hash !== "#" + target.id) {
            history.pushState(null, "", "#" + target.id);
          }
          owner.reveal(target, function () {
            scrollToTarget(target);
          });
        } else {
          scrollToTarget(target);
        }
      },
      true,
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
      { passive: true },
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
