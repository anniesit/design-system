/* Modal JS */
/* Source: https://cdn.jsdelivr.net/gh/nocodesupplyco/mast@latest/modal.min.js */
/* Original: https://github.com/nocodesupplyco/mast/blob/master/modal.js */

/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /gh/nocodesupplyco/mast@master/modal.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(){"use strict";function o(){try{const o=document.querySelectorAll("dialog");if(0===o.length)return;document.addEventListener("click",t),o.forEach(n),o.forEach(e)}catch(o){console.warn("Modal initialization failed:",o)}}function t(o){const t=o.target;if(t.closest("dialog + button")){o.preventDefault();const n=t.previousElementSibling;n&&"DIALOG"===n.tagName&&n.showModal()}else if(t.closest('dialog button.modal_close-button, dialog button[data-modal="close"]')){o.preventDefault();const n=t.closest("dialog");n&&n.close()}else;}function n(o){o.addEventListener("click",(function(t){t.target===o&&o.close()})),o.addEventListener("close",(function(){!function(o){const t=parseInt(o.dataset.modalCooldownDays,10);if(t>0){const n=a(o);n&&function(o,t){try{const n=`modal-cooldown-${o}`,e=Date.now(),a=e+24*t*60*60*1e3;localStorage.setItem(n,a.toString())}catch(o){console.warn("Error storing modal cooldown:",o)}}(n,t)}}(o)}))}function e(o){if(!("true"===o.dataset.modalOpenOnLoad))return;const t=parseInt(o.dataset.modalCooldownDays,10)||0,n=a(o);n&&(t>0&&function(o){try{const t=`modal-cooldown-${o}`,n=localStorage.getItem(t);if(!n)return!1;const e=Date.now();return!(e>parseInt(n,10))||(localStorage.removeItem(t),!1)}catch(o){return console.warn("Error checking modal cooldown:",o),!1}}(n)||o.showModal())}function a(o){const t=o.parentElement;return t&&t.id?t.id:(console.log("Modal component must have ID set for cooldown to work."),null)}document.querySelector("dialog")&&("loading"===document.readyState?document.addEventListener("DOMContentLoaded",o):o())}();
//# sourceMappingURL=/sm/e5f1655ae42808c2d5b10115c913767fc84901d0f59eb403a9290f695a83e4a8.map
