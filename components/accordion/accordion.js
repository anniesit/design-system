/* Accordion JS */
/* Derived from: https://cdn.jsdelivr.net/gh/nocodesupplyco/mast@latest/accordion.min.js */
/* Original:     https://github.com/nocodesupplyco/mast/blob/master/accordion.js */

/*
 * This is a CUSTOM BUILD, not MAST's minified original. The logic below is a
 * faithful expansion of that file — every branch is preserved — plus two
 * additions, both marked CUSTOM inline:
 *
 *   1. data-accordion-tablet-close="true"
 *      Put this on any <details> that should start CLOSED on viewports 991px
 *      and below. It overrides data-accordion-start-open="true" there.
 *      Accordions without the attribute are unaffected.
 *
 *   2. window.MastAccordion.init()
 *      Re-scans the page and wires up any accordion that has appeared since
 *      the last run. Call it after rendering accordions from data.
 *
 * WHY (2) EXISTS. The animation is not CSS — it is a pair of listeners this
 * file attaches to each <summary> and <details> on DOMContentLoaded. A page
 * that clones a template to build accordions at runtime gets unbound copies,
 * because cloneNode() copies attributes and children but NOT listeners. Those
 * accordions then fall back to the native instant open/close with no
 * transition. Such a page must call window.MastAccordion.init() after it
 * appends its accordions.
 *
 * TWO RULES FOR ANY PAGE THAT CLONES AN ACCORDION TEMPLATE:
 *
 *   - Strip data-accordion-bound from the clone. This file stamps that
 *     attribute on everything it has wired up, and skips anything already
 *     carrying it. A clone inherits the stamp without inheriting the
 *     listeners, so an un-stripped clone is invisible to init() forever.
 *
 *   - An accordion meant to start open needs BOTH `open` and
 *     data-accordion-start-open="true". The latter only PROTECTS an existing
 *     `open` from being stripped below — it never adds one. (Webflow drops a
 *     valueless `open` attribute when it publishes, so a template generally
 *     cannot carry it and the rendering script has to set it.)
 *     Conversely, an accordion that should start CLOSED must not have
 *     data-accordion-start-open at all, or it never gets collapsed to
 *     height:0 and its first open animates from full height to full height —
 *     i.e. visibly not at all.
 */

(function () {
  "use strict";

  /* Set up once per page, however many times init() runs. */
  var setupDone = false;
  var prefersReducedMotion = false;

  function setupOnce() {
    if (setupDone) return;
    setupDone = true;

    /* While an accordion in a [name] group is being closed to make room for
       another, its content must stay rendered or there is nothing to animate. */
    var style = document.createElement("style");
    style.textContent =
      "details[data-accordion-animating]::details-content{content-visibility:visible!important;display:block!important;}";
    document.head.appendChild(style);

    try {
      var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion = mq.matches;
      mq.addEventListener("change", function (e) {
        prefersReducedMotion = e.matches;
      });
    } catch (e) {
      prefersReducedMotion = false;
    }
  }

  /* Collapse one accordion's content to zero height, animated.
     Used both for the accordion being closed and for the sibling being
     pushed out of the way in a [name] group. */
  function collapse(content, onDone) {
    content.style.height = content.scrollHeight + "px";
    void content.offsetHeight; /* force a reflow so the height above is a real starting point */

    if (typeof gsap !== "undefined") {
      gsap.killTweensOf(content);
      gsap.to(content, {
        height: 0,
        duration: 0.4,
        ease: "power3.inOut",
        onComplete: onDone,
      });
    } else {
      content.style.transition = "height 0.4s ease-in-out";
      content.style.height = "0px";
      setTimeout(function () {
        content.style.transition = "";
        onDone();
      }, 400);
    }
  }

  function bind(details) {
    var summary = details.querySelector("summary");
    var content = details.querySelector("[data-accordion='content']");
    if (!summary || !content) return;

    /* Anything not genuinely starting open begins collapsed, so its first open
       has a zero height to animate away from.

       Note this tests `open` as well as the attribute, where MAST tested the
       attribute alone. Two cases need it:
         - data-accordion-start-open="true" but no `open` — the state Webflow
           publishes, since it drops a valueless `open`. Left uncollapsed, the
           first open would animate from full height to full height.
         - a clone of a template this file had already collapsed, which carries
           an inherited inline height:0 that no `toggle` will ever clear,
           because the browser never toggles an already-open <details>. */
    if (details.open && details.getAttribute("data-accordion-start-open") === "true") {
      content.style.height = "auto";
      content.style.overflow = "";
    } else if (typeof gsap !== "undefined") {
      gsap.set(content, { height: 0, overflow: "clip" });
    } else {
      content.style.height = "0px";
      content.style.overflow = "clip";
    }

    /* Closing. The click is intercepted so the `open` attribute survives
       until the collapse has finished playing. */
    summary.addEventListener("click", function (event) {
      if (details.hasAttribute("open")) {
        event.preventDefault();

        if (prefersReducedMotion) {
          details.removeAttribute("open");
          return;
        }
        collapse(content, function () {
          details.removeAttribute("open");
        });
        return;
      }

      /* Opening. If this accordion is in a [name] group, close whichever
         sibling is currently open — the browser would otherwise snap it
         shut with no animation. */
      var groupName = details.getAttribute("name");
      if (!groupName || prefersReducedMotion) return;

      document
        .querySelectorAll('details[name="' + groupName + '"][open]')
        .forEach(function (other) {
          if (other === details) return;
          var otherContent = other.querySelector("[data-accordion='content']");
          if (!otherContent) return;

          if (typeof gsap !== "undefined") gsap.killTweensOf(otherContent);
          otherContent.style.overflow = "clip";
          otherContent.style.display = "block";
          other.dataset.accordionAnimating = "closing";

          collapse(otherContent, function () {
            delete other.dataset.accordionAnimating;
            otherContent.style.height = "0px";
            otherContent.style.display = "";
          });
        });
    });

    /* Opening, part two. `toggle` fires once the browser has set `open`,
       which is the first moment the content can be measured. */
    details.addEventListener("toggle", function () {
      if (!details.open) return;
      var target = content.scrollHeight;

      if (prefersReducedMotion) {
        content.style.height = "auto";
        return;
      }
      if (typeof gsap !== "undefined") {
        gsap.killTweensOf(content);
        gsap.to(content, {
          height: target,
          duration: 0.4,
          ease: "power3.out",
          onComplete: function () {
            content.style.height = "auto";
          },
        });
      } else {
        content.style.transition = "height 0.4s ease-out";
        content.style.height = target + "px";
        setTimeout(function () {
          content.style.height = "auto";
          content.style.transition = "";
        }, 400);
      }
    });
  }

  /* CUSTOM: safe to call repeatedly. Only accordions this file has not
     already wired up are touched, so a re-scan never double-binds a
     listener and never slams shut something the reader has opened. */
  function init() {
    var fresh = document.querySelectorAll("details:not([data-accordion-bound])");
    if (fresh.length === 0) return;

    setupOnce();

    /* CUSTOM: data-accordion-tablet-close — see the header comment. */
    if (window.matchMedia("(max-width: 991px)").matches) {
      fresh.forEach(function (details) {
        if (details.getAttribute("data-accordion-tablet-close") === "true") {
          details.setAttribute("data-accordion-start-open", "false");
        }
      });
    }

    /* An accordion left open in the Designer opens the page mid-scroll
       unless it asked to. */
    fresh.forEach(function (details) {
      if (
        details.hasAttribute("open") &&
        details.getAttribute("data-accordion-start-open") !== "true"
      ) {
        details.removeAttribute("open");
      }
    });

    fresh.forEach(function (details) {
      details.setAttribute("data-accordion-bound", "");
      bind(details);
    });
  }

  window.MastAccordion = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
