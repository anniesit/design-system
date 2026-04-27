(function () {
    const trigger = document.querySelector('.toc_trigger');
    const list = document.querySelector('.toc_list');
    const icon = document.querySelector('.icon_toc_trigger');
    const links = list.querySelectorAll('.link_subnav');
    const BREAKPOINT = 992;

    let isMobile = window.innerWidth < BREAKPOINT;

    function close() {
      list.style.maxHeight = '0';
      list.style.overflow = 'hidden';
      icon.style.transform = 'rotate(0deg)';
    }

    function open() {
      list.style.overflow = 'hidden';
      list.style.maxHeight = list.scrollHeight + 'px';
      icon.style.transform = 'rotate(180deg)';

      list.addEventListener('transitionend', function handler() {
        if (isOpen()) list.style.overflow = 'visible';
        list.removeEventListener('transitionend', handler);
      });
    }

    function isOpen() {
      return list.style.maxHeight !== '0px' && list.style.maxHeight !== '0';
    }

    // Set initial state
    if (isMobile) close();

    // Toggle on trigger click (mobile only)
    trigger.addEventListener('click', function () {
      if (!isMobile) return;
      isOpen() ? close() : open();
    });

    // Close on link click (mobile only)
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        if (isMobile) close();
      });
    });

    // Handle resize
    window.addEventListener('resize', function () {
      const wasMobile = isMobile;
      isMobile = window.innerWidth < BREAKPOINT;

      if (isMobile && !wasMobile) {
        // Crossed from desktop → mobile: close
        close();
      } else if (!isMobile && wasMobile) {
        // Crossed from mobile → desktop: reset inline styles
        list.style.maxHeight = '';
        list.style.overflow = '';
        icon.style.transform = '';
      }
    });
  })();