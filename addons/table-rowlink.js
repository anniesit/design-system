/* ============================================================
 * table-rowlink.js — clickable + accessibly-named table rows
 *
 * Not bundled into all.js — an opt-in add-on, link it separately only on
 * pages that have a clickable-row table.
 *
 * THE PROBLEM THIS SOLVES: the natural way to make a whole table row
 * clickable is a full-row link overlay — `a.u-link-cover` inside a
 * `.table-cell`, stretched with `inset:0`. That overlay CANNOT stay
 * pointer-interactive: an absolutely positioned link sitting on top of a
 * horizontally scrollable table swallows the swipe gesture on iPadOS WebKit
 * (Safari and Chrome — both are WebKit there), so the table can't be
 * scrolled sideways, even though the identical setup scrolls fine on desktop
 * and iPhone. The fix is `.table-cell .u-link-cover { pointer-events: none }`
 * (add this in the project's own CSS/Webflow custom code — it is NOT in this
 * file, because it must be scoped to *this project's* table markup) — which
 * restores scrolling but also disables the link's own click and screen-reader
 * name.
 *
 * This script restores both, without reintroducing an interactive overlay:
 *
 * 1. NAVIGATION — a delegated click listener navigates to the row's single
 *    source of truth: the `href` on that same `a.u-link-cover`. The
 *    destination is set in exactly ONE place (the cover's href) and the row
 *    is clickable + scrollable on desktop, iPhone, and iPad alike.
 *
 * 2. ACCESSIBLE NAME — the cover is an EMPTY anchor, so without help a
 *    screen reader announces a nameless link (or just reads out the URL).
 *    This points the cover's `aria-labelledby` at the row's first cell
 *    (typically an identifying column, e.g. a code or title), so the link is
 *    named by that row's own visible identifier — unique per row, no
 *    duplicated copy, stays in sync with the cell text. Keyboard use is
 *    unaffected (pointer-events:none blocks pointer input only); Enter on
 *    the focused cover navigates natively.
 *
 * The accessible name is applied in JS, so it is JS-dependent — but so is
 * the whole clickable-row setup (pointer-events:none + this script), so it
 * adds no new failure mode. Server-rendered aria-labelledby would be more
 * robust if the rows are server-rendered to begin with.
 *
 * Markup contract:
 *   .table-row                         — a body row (header row has no cover)
 *     .table-cell (first)  > p         — the row's identifying text
 *     .table-cell a.u-link-cover[href] — carries the destination + gets named
 *
 * Required CSS (add in the consuming project, not here):
 *   .table-cell .u-link-cover { pointer-events: none; }
 * Scope it to `.table-cell` specifically — a global `.u-link-cover { … }`
 * rule will also disable any other link reusing that class elsewhere on the
 * page (e.g. a footer logo link is a common case).
 *
 * Handles rows injected after load (e.g. by an API response) via a
 * MutationObserver, so the accessible name is present before a
 * screen-reader user reaches the link — not deferred to click time.
 * ============================================================ */
(function () {
  "use strict";

  var READY = "data-rowlink-ready";

  // Covers scoped to match the CSS that neutralised them
  // (`.table-cell .u-link-cover { pointer-events:none }`). A .u-link-cover
  // that is NOT inside a cell stays pointer-interactive and handles its own
  // click, so we must not touch it.
  var COVER = ".table-cell a.u-link-cover";
  var COVER_LINK = COVER + "[href]"; // a cover that is actually a link yet

  // Elements that must handle their own clicks — don't hijack these.
  var INTERACTIVE = "a:not(.u-link-cover), button, input, select, textarea, label";

  // ---- accessible name -------------------------------------------------

  var seq = 0;
  function uniqueId() {
    var id;
    do {
      id = "rowlink-id-" + ++seq;
    } while (document.getElementById(id));
    return id;
  }

  // Name each row's cover after its first cell. Idempotent, and a no-op on
  // the header row (no cover) or a row whose first cell is blank (leaving it
  // unnamed rather than pointing at empty text).
  function nameRow(row) {
    var cover = row.querySelector(COVER);
    if (!cover) return;

    var cell = row.querySelector(".table-cell");
    if (!cell) return;

    // Prefer the text <p>, never the <td> — the <td> may also contain the
    // cover anchor, and labelling by an ancestor of the cover risks a cycle.
    var target = cell.querySelector("p") || cell;
    if (!target.textContent || !target.textContent.trim()) return;

    if (!target.id) target.id = uniqueId();
    if (cover.getAttribute("aria-labelledby") !== target.id) {
      cover.setAttribute("aria-labelledby", target.id);
    }
  }

  function nameAll(root) {
    var rows = (root || document).querySelectorAll(".table-row");
    for (var i = 0; i < rows.length; i++) nameRow(rows[i]);
  }

  // Catch rows injected after load, so the name exists before the link is
  // reached — not deferred to click time.
  function watch() {
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue; // elements only
          if (node.matches && node.matches(".table-row")) nameRow(node);
          if (node.querySelectorAll) nameAll(node); // descendant rows
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ---- navigation ------------------------------------------------------

  function destinationFor(row) {
    var a = row.querySelector(COVER_LINK);
    if (!a) return null;
    var href = a.getAttribute("href");
    if (!href || href === "#") return null; // not wired yet
    return a; // return the element so we get its resolved .href + target
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0) return; // left click / tap only

    // Keyboard activation (Enter) fires a click whose target IS the cover —
    // pointer-events:none never lets a pointer land there. Let the real <a>
    // do its native navigation so we don't double-handle it.
    if (e.target.closest("a.u-link-cover")) return;

    // A drag-to-select shouldn't navigate.
    var sel = window.getSelection && window.getSelection();
    if (sel && sel.type === "Range" && String(sel).length) return;

    var row = e.target.closest(".table-row");
    if (!row) return;
    if (e.target.closest(INTERACTIVE)) return; // real control won — leave it

    var a = destinationFor(row);
    if (!a) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") {
      window.open(a.href, "_blank", "noopener");
    } else {
      window.location.href = a.href;
    }
  }

  // ---- init ------------------------------------------------------------

  function init() {
    var root = document.documentElement;
    if (root.hasAttribute(READY)) return; // idempotent
    root.setAttribute(READY, "");

    document.addEventListener("click", onClick);
    nameAll(document); // server-rendered rows
    watch(); // rows injected after load
  }

  window.initTableRowLink = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
