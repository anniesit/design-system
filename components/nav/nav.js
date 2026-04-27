/* Nav */
/* Skip-link accessibility helper. */

//---- Skip to <main> backup if #main anchor link isn't set ----
document.addEventListener('DOMContentLoaded', () => {
  const skipLinkEle = document.getElementById('skip-link');
  if (!skipLinkEle) return;
  skipLinkEle.addEventListener('click', handleSkipLink);
  skipLinkEle.addEventListener('keydown', handleSkipLink);
});
function handleSkipLink(e) {
  if (e.type === 'keydown' && e.key !== 'Enter') return;
  e.preventDefault();
  const target = document.querySelector('main');
  target.setAttribute('tabindex', '-1');
  target.focus();
}
