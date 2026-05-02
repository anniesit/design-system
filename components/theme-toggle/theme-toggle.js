/* Theme Toggle JS */
/* Source: https://cdn.jsdelivr.net/gh/nocodesupplyco/mast@latest/theme-toggle.min.js */
/* Original: https://github.com/nocodesupplyco/mast/blob/master/theme-toggle.js */

/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /gh/nocodesupplyco/mast@master/theme-toggle.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(){const e=document.documentElement,t=localStorage.getItem("savedTheme"),n=window.matchMedia("(prefers-color-scheme: dark)");function c(t){e.classList.toggle("u-mode-light",t),e.classList.toggle("u-mode-dark",!t)}let o=null!==t?"light"===t:!n.matches;c(o),window.addEventListener("DOMContentLoaded",(function(){const e=document.querySelectorAll('[data-theme-toggle="checkbox"]'),l=Array.from(e).map((function(e){return{checkbox:e,darkLabel:e.parentElement.querySelector('[data-theme-toggle="dark-label"]'),lightLabel:e.parentElement.querySelector('[data-theme-toggle="light-label"]')}}));function a(e){l.forEach((function(t){t.checkbox.checked=e,function(e,t,n){t&&n&&(t.style.display=e?"none":"block",n.style.display=e?"block":"none")}(e,t.darkLabel,t.lightLabel)}))}a(o),l.forEach((function(e){e.checkbox.addEventListener("change",(function(){o=e.checkbox.checked,c(o),localStorage.setItem("savedTheme",o?"light":"dark"),a(o)}))})),null===t&&n.addEventListener("change",(function(e){o=!e.matches,c(o),a(o)}))}))}();
//# sourceMappingURL=/sm/bdaa62f5eb22247589cebd16f103545baf6a7437d38e0d751b67ee39b1044ed8.map
