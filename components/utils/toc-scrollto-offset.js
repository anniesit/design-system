const tocBreakpoint = (window.DS_CONFIG && window.DS_CONFIG.tocBreakpoint) || 992;

/* Scroll to position offset for all hash links */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const selector = this.getAttribute("href");
    if (!selector || selector === "#") return;
    const target = document.querySelector(selector);
    if (target) {
      const navEl = document.querySelector(".nav");
      if (!navEl) return;
      const navHeight = navEl.offsetHeight + 8;
      const tocTrigger = document.querySelector(".toc_trigger");
      const tocOffset = window.innerWidth < tocBreakpoint && tocTrigger ? tocTrigger.offsetHeight : 0;
      setTimeout(() => {
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - tocOffset;
        window.scrollTo({ top: targetPosition, behavior: "smooth" });
      }, 10);
    }
  });
});
/*TOC Interactions*/
(function () {
  const trigger = document.querySelector(".toc_trigger");
  const list = document.querySelector(".toc_list");
  if (!list || !trigger) return;
  const icon = document.querySelector(".icon_toc_trigger");
  const links = list.querySelectorAll(".link_subnav");
  const BREAKPOINT = 992;
  let isMobile = window.innerWidth < BREAKPOINT;
  function close() {
    list.style.maxHeight = "0";
    list.style.overflow = "hidden";
    icon.style.transform = "rotate(0deg)";
  }
  function open() {
    list.style.overflow = "hidden";
    list.style.maxHeight = list.scrollHeight + "px";
    icon.style.transform = "rotate(180deg)";
    list.addEventListener("transitionend", function handler() {
      if (isOpen()) list.style.overflow = "visible";
      list.removeEventListener("transitionend", handler);
    });
  }
  function isOpen() {
    return list.style.maxHeight !== "0px" && list.style.maxHeight !== "0";
  }
  // Set initial state
  if (isMobile) close();
  // Toggle on trigger click (mobile only)
  trigger.addEventListener("click", function () {
    if (!isMobile) return;
    isOpen() ? close() : open();
  });
  // Close on link click (mobile only)
  links.forEach(function (link) {
    link.addEventListener("click", function () {
      if (isMobile) close();
    });
  });
  // Handle resize
  window.addEventListener("resize", function () {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < BREAKPOINT;
    if (isMobile && !wasMobile) {
      // Crossed from desktop → mobile: close
      close();
    } else if (!isMobile && wasMobile) {
      // Crossed from mobile → desktop: reset inline styles
      list.style.maxHeight = "";
      list.style.overflow = "";
      icon.style.transform = "";
    }
  });
})();
