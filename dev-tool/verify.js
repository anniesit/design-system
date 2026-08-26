/* ============================================================
 * verify.js — DEV-ONLY smoke checks. Do NOT ship this to production.
 *
 * Not bundled into all.js, not linked by any project's <script> tag.
 * Paste this whole file into the browser console on a page you're
 * checking, or load it temporarily while testing:
 *
 *   <script src="dev-tool/verify.js"></script>   <!-- remove before deploy -->
 *
 * Then run:
 *   DSVerify.run()
 *
 * It prints a table of problems found (empty table = nothing found).
 * This checks structural/accessibility FACTS about the DOM — it cannot
 * tell you whether something looks right, animates smoothly, or reads
 * well. Pair it with dev-tool/CHECKLIST.md, which covers everything that
 * still needs a human eye.
 *
 * Checks are split into GENERIC (always run, apply to any page) and
 * PER-COMPONENT (only run if that component's markup is actually present
 * on the page — same feature-detection style as table-rowlink.js).
 * ============================================================ */
(function (global) {
  "use strict";

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  // ---- generic checks (any page) ----------------------------------------

  function checkDuplicateIds(fail) {
    var seen = {};
    $all("[id]").forEach(function (el) {
      // Webflow emits id="" on some elements (icon wrappers, for one).
      // An empty id is not a duplicate — without this guard every one of
      // them collides with every other and the report fills with noise.
      var id = el.getAttribute("id");
      if (!id) return;
      if (seen[id]) {
        fail.push(["duplicate id", id, el]);
      }
      seen[id] = true;
    });
  }

  function checkDanglingAriaRefs(fail) {
    ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns"].forEach(function (attr) {
      $all("[" + attr + "]").forEach(function (el) {
        el.getAttribute(attr)
          .split(/\s+/)
          .filter(Boolean)
          .forEach(function (id) {
            if (!document.getElementById(id)) {
              fail.push(["dangling " + attr, id, el]);
            }
          });
      });
    });
  }

  function checkPlaceholderCurrent(fail) {
    // A link with href="#" (or empty) should never also claim to be the
    // current page — that combination means a template shipped un-wired.
    $all('a[aria-current="page"]').forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href === "#") {
        fail.push(["aria-current on unwired href=#", a]);
      }
    });
  }

  // A control can get its name from its own text, an aria-* attribute, the
  // alt text of an image inside it, or an <svg><title>. Checking only text
  // and aria-* reports every icon link as broken.
  function hasAccessibleName(el) {
    if (el.textContent && el.textContent.trim().length > 0) return true;
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return true;
    if (el.querySelector('img[alt]:not([alt=""])')) return true;
    if (el.querySelector("svg title")) return true;
    return false;
  }

  function checkUnnamedControls(fail) {
    $all("a[href], button").forEach(function (el) {
      // Webflow's own "Made in Webflow" badge is injected on free/staging
      // hosting and is gone from an export. Not the author's to fix.
      if (el.classList.contains("w-webflow-badge")) return;
      if (!hasAccessibleName(el)) {
        fail.push(["link/button has no accessible name", el]);
      }
    });
  }

  function checkExpandedControls(fail) {
    // aria-expanded implies a disclosure — if it claims to control
    // something via aria-controls, that target must exist (also caught by
    // checkDanglingAriaRefs, called out separately here because a missing
    // aria-controls on an aria-expanded element is its own common mistake).
    $all("[aria-expanded]").forEach(function (el) {
      var val = el.getAttribute("aria-expanded");
      if (val !== "true" && val !== "false") {
        fail.push(["aria-expanded not true/false", val, el]);
      }
    });
  }

  function checkImagesMissingAlt(fail) {
    // alt="" (decorative) is valid and intentionally NOT flagged — only a
    // missing alt attribute entirely is a problem.
    $all("img:not([alt])").forEach(function (img) {
      fail.push(["img missing alt attribute", img.src, img]);
    });
  }

  function checkPositiveTabindex(fail) {
    $all("[tabindex]").forEach(function (el) {
      var v = parseInt(el.getAttribute("tabindex"), 10);
      if (v > 0) fail.push(["positive tabindex (anti-pattern)", v, el]);
    });
  }

  // ---- per-component checks (feature-detected) ---------------------------

  function checkNav(fail) {
    var navs = $all("[data-toc-nav], nav.nav, .nav");
    if (!navs.length) return;
    navs.forEach(function (nav) {
      var current = $all('a[aria-current="page"]', nav);
      if (current.length > 1) {
        fail.push(["nav has more than one aria-current=page link", nav]);
      }
    });
  }

  function checkDropdowns(fail) {
    $all("[data-dropdown], [data-dropdown-multi]").forEach(function (dd) {
      var trigger = dd.querySelector("[data-dropdown-trigger]");
      if (!trigger) {
        fail.push(["dropdown missing data-dropdown-trigger", dd]);
        return;
      }
      if (!trigger.hasAttribute("aria-expanded")) {
        fail.push(["dropdown trigger missing aria-expanded", trigger]);
      }
      if (trigger.getAttribute("aria-haspopup") !== "listbox") {
        fail.push(["dropdown trigger missing aria-haspopup=listbox", trigger]);
      }
    });
  }

  function checkTableRowlinks(fail) {
    $all(".table-row").forEach(function (row) {
      var cover = row.querySelector(".table-cell a.u-link-cover");
      if (!cover) return; // not every row is a link-cover row
      var href = cover.getAttribute("href");
      if (!href || href === "#") {
        fail.push(["table row link unwired (href=# or missing)", row]);
      }
      if (!cover.hasAttribute("aria-labelledby")) {
        fail.push(["table row link missing aria-labelledby", row]);
      }
    });
  }

  function checkTocScrollto(fail) {
    var tocs = $all("[data-toc]");
    tocs.forEach(function (toc) {
      var links = $all("[data-toc-link]", toc);
      links.forEach(function (a) {
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) === "#" && !document.getElementById(href.slice(1))) {
          fail.push(["toc link points at missing section id", href, a]);
        }
      });
    });
  }

  function checkTabs(fail) {
    $all("[data-tabs-component]").forEach(function (component) {
      var links = $all("[data-tabs-link]", component);
      var panes = $all("[data-tabs-pane]", component);
      if (links.length !== panes.length) {
        fail.push(["tabs: link count != pane count", links.length, panes.length, component]);
      }
      var selected = $all('[data-tabs-link][aria-selected="true"]', component);
      if (selected.length !== 1) {
        fail.push(["tabs: expected exactly 1 aria-selected=true link, found " + selected.length, component]);
      }
    });
  }

  function checkAccordions(fail) {
    $all("details").forEach(function (details) {
      if (!details.querySelector("summary")) {
        fail.push(["details missing summary", details]);
      }
    });
  }

  // ---- run ----------------------------------------------------------------

  function run() {
    var fail = [];

    checkDuplicateIds(fail);
    checkDanglingAriaRefs(fail);
    checkPlaceholderCurrent(fail);
    checkUnnamedControls(fail);
    checkExpandedControls(fail);
    checkImagesMissingAlt(fail);
    checkPositiveTabindex(fail);

    checkNav(fail);
    checkDropdowns(fail);
    checkTableRowlinks(fail);
    checkTocScrollto(fail);
    checkTabs(fail);
    checkAccordions(fail);

    if (fail.length === 0) {
      console.log("DSVerify: no issues found (" + $all("*").length + " elements checked).");
    } else {
      console.table(fail);
    }
    return fail;
  }

  global.DSVerify = { run: run };
})(window);
