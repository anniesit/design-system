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
 * and iPhone. The fix is `.table-cell .u-link-cover { pointer-events: none }`,
 * which ships next to this file as **addons/table-rowlink.css** — that
 * restores scrolling but also disables the link's own click and
 * screen-reader name, which is what the rest of this script is for.
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
 * Naming the row link:
 *   1. An aria-label (or a working aria-labelledby) already on the cover is
 *      left alone. An author's own name always wins.
 *   2. Otherwise pick the naming cell: one marked [data-rowlink-label], else
 *      the FIRST cell. Note "first cell", not "the cell holding the cover" —
 *      they are the same cell by convention, but the script always looks in
 *      the first one unless you mark another.
 *   3. Inside that cell, prefer a <p> over the cell itself.
 * So the <p> belongs in whichever cell supplies the name. It is strictly
 * required only when that cell also holds the cover, because naming a link
 * after one of its own ancestors risks a cycle. When the naming cell has no
 * cover in it, the cell alone works — the <p> is still tidier, since it
 * isolates the identifying text from any icon or badge in the same cell.
 * A row whose chosen target has no text is left unnamed rather than named
 * with an empty string.
 *
 * LINK BOTH FILES OR NEITHER. Half-installing fails in a way that is easy
 * to miss:
 *   - CSS only, no JS → rows are completely unclickable.
 *   - JS only, no CSS → rows click fine on desktop and iPhone, and the iPad
 *                       horizontal-scroll bug is silently back. Nothing
 *                       errors; you only find out on an actual iPad.
 * Because that second case is the dangerous one, init() checks the computed
 * pointer-events of the first cover it finds and warns in the console if the
 * stylesheet is missing.
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

    // Never override a name the author set on purpose. aria-labelledby
    // outranks aria-label in the accessible-name order, so writing ours
    // would silently beat an aria-label the author put there.
    if (cover.hasAttribute("aria-label")) return;
    var existing = cover.getAttribute("aria-labelledby");
    if (existing && document.getElementById(existing)) return;

    // Which cell supplies the name: one the author marked, else the first.
    // Mark a cell when the first one would read badly — a row number, a
    // checkbox, an icon.
    var target = row.querySelector("[data-rowlink-label]") || row.querySelector(".table-cell");
    if (!target) return;

    // Then prefer a <p> inside it over the cell itself. The cell may also
    // contain the cover anchor, and naming a link after one of its own
    // ancestors risks a cycle. Marking the <p> directly works too — it has
    // no <p> inside it, so it stays the target.
    target = target.querySelector("p") || target;
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
    warnIfCssMissing();
  }

  // The JS half works on its own, which is exactly why a missing stylesheet
  // is dangerous — clicks keep working and only iPad scrolling breaks. Say so
  // rather than letting it pass silently.
  function warnIfCssMissing() {
    var probe = document.querySelector(COVER);
    if (!probe || !window.getComputedStyle) return;
    if (window.getComputedStyle(probe).pointerEvents !== "none") {
      console.warn(
        "table-rowlink: addons/table-rowlink.css is not applied " +
          "(.table-cell .u-link-cover should be pointer-events:none). " +
          "Row clicks will still work, but the table will not scroll " +
          "horizontally on iPad. Link the stylesheet."
      );
    }
  }

  window.initTableRowLink = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
