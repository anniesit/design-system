// Figure out the base path for components, regardless of which folder we're in
function getComponentsBase() {
  if (window.location.pathname.includes("/zh/")) {
    return "../components/";
  }
  return "components/";
}

async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(componentPath);
    if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
  } catch (error) {
    console.error("Error loading component:", error);
  }
}

// Update the language switcher link to point to the same page in the other language
function updateLanguageSwitcher() {
  const switchButton = document.querySelector("[data-lang-switch]");
  if (!switchButton) return;

  const targetLang = switchButton.getAttribute("data-lang-switch");
  const currentPath = window.location.pathname;
  const projectBase = "/hkbutimescape"; // <--project subfolder

  // Strip the project base off the front to get the "inner" path
  let innerPath = currentPath.replace(projectBase, "");
  // e.g. '/contribute.html' or '/zh/contribute.html'

  let newInnerPath;
  if (targetLang === "zh") {
    // English → Chinese: prepend /zh
    newInnerPath = "/zh" + innerPath;
  } else {
    // Chinese → English: strip /zh from the start
    newInnerPath = innerPath.replace(/^\/zh/, "");
  }

  // Reassemble the full path with project base + new inner path
  switchButton.setAttribute("href", projectBase + newInnerPath);
}

// Initialize skip-to-main-content link
function initSkipLink() {
  const skipLinkEle = document.getElementById("skip-link");
  if (!skipLinkEle) return;
  skipLinkEle.addEventListener("click", handleSkipLink);
  skipLinkEle.addEventListener("keydown", handleSkipLink);
}

function handleSkipLink(e) {
  if (e.type === "keydown" && e.key !== "Enter") return;
  e.preventDefault();
  const target = document.querySelector("main");
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.focus();
}

// Auto-load components on page load
document.addEventListener("DOMContentLoaded", async function () {
  const headerElement = document.querySelector("[data-header]");
  if (headerElement) {
    const headerName = headerElement.getAttribute("data-header");
    await loadComponent(headerElement.id, `${getComponentsBase()}header${headerName}.html`);
    updateLanguageSwitcher();
    initSkipLink();
    // Re-initialize MAST's nav skip-link after dynamically loaded nav
    if (window.Webflow) {
      window.Webflow.destroy();
      window.Webflow.ready();
      const ix2 = window.Webflow.require("ix2");
      if (ix2) ix2.init();
    }
  }

  const footerElement = document.querySelector("[data-footer]");
  if (footerElement) {
    const footerName = footerElement.getAttribute("data-footer");
    await loadComponent(footerElement.id, `${getComponentsBase()}footer${footerName}.html`);
  }
});

/* 
Insert in html
<div id="header-container" data-header=""></div>
<div id="footer-container" data-footer=""></div>
<div id="header-container" data-header="ZH"></div>
<div id="footer-container" data-footer="ZH"></div>
<script src="js/component-loader.js"></script>

For alternate header and footer, 
name file as headerNAME.html and footerNAME.html, and
set data-header="NAME" and data-footer="NAME"

Update project subfolder (line27)
*/
