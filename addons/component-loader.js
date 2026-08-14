/* ============================================================
 * component-loader.js — loads the shared nav + footer partials
 *
 * Not bundled into all.js — link this separately after Webflow export,
 * after all.css/all.js:
 *   <div id="header-container" data-header=""></div>
 *   <div id="footer-container" data-footer=""></div>
 *   <script src="js/component-loader.js" defer></script>
 *
 * For an alternate nav/footer, name the file navNAME.html / footerNAME.html
 * in /components and set data-header="NAME" / data-footer="NAME".
 *
 * Uses fetch(), so pages must be served over http(s) — opening an .html
 * file directly from disk (file://) is blocked by CORS and the nav/footer
 * will not appear. That is a local-preview limitation only.
 *
 * Behaviour, and why:
 *
 * 1. REPLACES the placeholder, does not fill it. `container.innerHTML = html`
 *    would leave the nav wrapped inside the placeholder div — and `.nav` is
 *    `position: sticky; top: 0`, which only sticks within its parent's box.
 *    So the placeholder element itself is swapped out for the partial,
 *    leaving the DOM the same as if the markup had been in the page all
 *    along.
 *
 * 2. REWRITES relative paths in the injected markup. Partials in /components
 *    are authored with paths relative to the SITE ROOT (`index.html`,
 *    `images/logo.png`), but get injected into pages that may live one or
 *    more folders deep (`about/`, `zh/about/`, etc.) and need `../` in
 *    front. The base path is DERIVED from the page's own stylesheet link
 *    (see basePath() below) rather than counted from location.pathname, so
 *    the site works at a domain root or in any subfolder with no per-project
 *    edit.
 *
 * 3. SETS aria-current on the current page's nav link after insertion.
 *    Webflow's own "links" module adds the .w--current CLASS on ready(), but
 *    it does not set aria-current — and a static aria-current baked into the
 *    partial would mark that link as current on every page it's injected
 *    into, so it must be computed at runtime instead. This MUST run on nodes
 *    already in the page: a <template>'s content lives in an inert document
 *    whose base URL is about:blank, so `a.href` there never matches
 *    location.
 *
 * 4. BILINGUAL SWITCHING is opt-in via DS_CONFIG, not on by default. Most
 *    projects are single-language and don't need it. See README.md
 *    "Per-project configuration" for the two options that turn it on.
 * ============================================================ */
(function () {
  "use strict";

  // ---- config ------------------------------------------------------------
  var CONFIG = window.DS_CONFIG || {};
  // Filename the base path is derived from — override if a project doesn't
  // ship css/normalize.css under that exact name.
  var BASE_PATH_ANCHOR = CONFIG.basePathAnchor || "css/normalize.css";

  // ---- base path -----------------------------------------------------
  // Reads the "../" (or "") prefix off a stylesheet link the export already
  // gets right on every page, instead of counting URL segments — that stays
  // correct however deep the page sits, with zero per-project editing.
  function basePath() {
    var link = document.querySelector('link[href$="' + BASE_PATH_ANCHOR + '"]');
    if (link) {
      var href = link.getAttribute("href");
      return href.slice(0, href.length - BASE_PATH_ANCHOR.length);
    }
    return ""; // fallback: assume the page is at the site root
  }

  var BASE = basePath();

  // ---- path rewriting for injected markup --------------------------------
  // Leave anything already absolute, protocol-relative, anchor-only, or a
  // non-http scheme (mailto:, tel:, data:) exactly as authored.
  var ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i;

  function resolve(value) {
    if (!value || ABSOLUTE.test(value)) return value;
    return BASE + value;
  }

  // srcset is a comma-separated list of "url descriptor" pairs.
  function resolveSrcset(value) {
    return value
      .split(",")
      .map(function (part) {
        var bits = part.trim().split(/\s+/);
        if (!bits[0]) return part;
        bits[0] = resolve(bits[0]);
        return bits.join(" ");
      })
      .join(", ");
  }

  function rewritePaths(root) {
    if (!BASE) return; // page is at the site root — partials are already correct
    root.querySelectorAll("[href]").forEach(function (el) {
      el.setAttribute("href", resolve(el.getAttribute("href")));
    });
    root.querySelectorAll("[src]").forEach(function (el) {
      el.setAttribute("src", resolve(el.getAttribute("src")));
    });
    root.querySelectorAll("[srcset]").forEach(function (el) {
      el.setAttribute("srcset", resolveSrcset(el.getAttribute("srcset")));
    });
  }

  // ---- current-page marking -----------------------------------------
  function markCurrent(nodes) {
    var here = location.href.split("#")[0].split("?")[0];
    nodes.forEach(function (node) {
      if (node.nodeType !== 1) return; // elements only
      var links = node.matches("a[href]") ? [node] : [];
      links = links.concat(Array.prototype.slice.call(node.querySelectorAll("a[href]")));
      links.forEach(function (a) {
        // Same-page anchors (e.g. the skip link) resolve to this page once
        // the hash is stripped — they are not "the current page".
        if (a.getAttribute("href").charAt(0) === "#") return;
        var href = a.href.split("#")[0].split("?")[0];
        if (href === here) a.setAttribute("aria-current", "page");
      });
    });
  }

  // ---- optional bilingual language switcher -------------------------
  // Off unless a project turns it on: set DS_CONFIG.bilingual = true and
  // DS_CONFIG.projectBase = "/your-subfolder" (the URL segment before the
  // page path — "" if the site is served from a domain root).
  function updateLanguageSwitcher() {
    if (!CONFIG.bilingual) return;
    var switchButton = document.querySelector("[data-lang-switch]");
    if (!switchButton) return;

    var targetLang = switchButton.getAttribute("data-lang-switch");
    var projectBase = CONFIG.projectBase || "";
    var innerPath = location.pathname.replace(projectBase, "");

    var newInnerPath;
    if (targetLang === "zh") {
      newInnerPath = "/zh" + innerPath;
    } else {
      newInnerPath = innerPath.replace(/^\/zh/, "");
    }

    switchButton.setAttribute("href", projectBase + newInnerPath);
  }

  // ---- loading --------------------------------------------------------
  async function loadComponent(placeholder, path) {
    try {
      var response = await fetch(path);
      if (!response.ok) throw new Error(response.status + " " + response.statusText);

      var template = document.createElement("template");
      template.innerHTML = (await response.text()).trim();

      rewritePaths(template.content);

      // Keep a handle on the nodes: replaceWith() empties the fragment, so
      // anything that needs the live, in-page elements must grab them first.
      var injected = Array.prototype.slice.call(template.content.childNodes);
      placeholder.replaceWith(template.content);
      markCurrent(injected);
      return true;
    } catch (error) {
      console.error("component-loader: could not load " + path + " —", error.message);
      return false;
    }
  }

  // ---- boot -------------------------------------------------------------
  async function boot() {
    var header = document.querySelector("[data-header]");
    var footer = document.querySelector("[data-footer]");
    var loadedHeader = false;

    if (header) {
      loadedHeader = await loadComponent(
        header,
        BASE + "components/nav" + header.getAttribute("data-header") + ".html"
      );
    }

    if (footer) {
      await loadComponent(
        footer,
        BASE + "components/footer" + footer.getAttribute("data-footer") + ".html"
      );
    }

    if (!loadedHeader) return;

    updateLanguageSwitcher();

    // Re-init anything that binds to nav markup — it landed before the nav
    // existed, so it bound to nothing and must run again now that it does.
    if (window.Webflow) {
      window.Webflow.destroy();
      window.Webflow.ready();
      try {
        var ix2 = window.Webflow.require("ix2");
        if (ix2 && ix2.init) ix2.init();
      } catch (e) {
        /* no ix2 module in this export — nothing to re-init */
      }
    }

    if (window.initSkipLink) window.initSkipLink();
    if (window.initNavScroll) window.initNavScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
