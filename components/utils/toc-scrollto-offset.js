const tocBreakpoint = (window.DS_CONFIG && window.DS_CONFIG.tocBreakpoint) || 992;

document.querySelectorAll('.toc_list a[href^="#"]').forEach((link) => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const selector = this.getAttribute('href');
    if (!selector || selector === '#') return;
    const target = document.querySelector(selector);
    if (target) {
      const navEl      = document.querySelector('.nav');
      const navHeight  = navEl ? navEl.offsetHeight + 8 : 0;
      const tocTrigger = document.querySelector('.toc_trigger');
      const tocOffset  = window.innerWidth < tocBreakpoint && tocTrigger ? tocTrigger.offsetHeight : 0;
      setTimeout(() => {
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - tocOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }, 10);
    }
  });
});