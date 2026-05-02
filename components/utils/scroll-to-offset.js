document.querySelectorAll('a[href^="#"]').forEach((link) => {
link.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
    const navHeight = document.querySelector('.nav').offsetHeight + 8;
    const tocTrigger = document.querySelector('.toc_trigger');
    const tocOffset = window.innerWidth < 992 && tocTrigger ? tocTrigger.offsetHeight : 0;
    setTimeout(() => {
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - tocOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }, 10);
    }
});
});