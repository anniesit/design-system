/* === Checkbox Indetermined State === */

function setupSelectAll(parent, children) {
  // 1. Parent click → set all children
  parent.addEventListener("change", () => {
    parent.indeterminate = false; // clicking always clears indeterminate
    children.forEach((child) => {
      child.checked = parent.checked;
    });
  });

  // 2. Any child change → recompute parent
  children.forEach((child) => {
    child.addEventListener("change", updateParent);
  });

  // 3. Compute parent's correct state from children
  function updateParent() {
    const checked = children.filter((c) => c.checked).length;
    if (checked === 0) {
      parent.checked = false;
      parent.indeterminate = false;
    } else if (checked === children.length) {
      parent.checked = true;
      parent.indeterminate = false;
    } else {
      parent.checked = false;
      parent.indeterminate = true;
    }
  }

  // Run once on load to set initial state
  updateParent();
}

document.querySelectorAll("[data-select-all-group]").forEach((group) => {
  const parent = group.querySelector("[data-select-all]");
  const children = Array.from(group.querySelectorAll("[data-select-all-child]"));
  if (parent && children.length) {
    setupSelectAll(parent, children);
  }
});

/* ============================================
   DROPDOWN (SINGLE SELECT)
   ============================================ */

function initDropdown(dropdown) {
  // === Element references ===
  const trigger = dropdown.querySelector("[data-dropdown-trigger]");
  const valueDisplay = dropdown.querySelector("[data-dropdown-value]");
  const hiddenInput = dropdown.querySelector('input[type="hidden"]');
  const options = Array.from(dropdown.querySelectorAll(".dropdown-option"));

  // === Open / close ===
  function open() {
    dropdown.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function close() {
    dropdown.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function toggle() {
    dropdown.classList.contains("is-open") ? close() : open();
  }

  // === Selection ===
  function selectOption(option) {
    // Mark only this option as selected
    options.forEach((o) => o.setAttribute("aria-selected", "false"));
    option.setAttribute("aria-selected", "true");
    // Update the trigger's visible text
    const label = option.querySelector(".dropdown-option-label").textContent;
    valueDisplay.textContent = label;
    // Update the hidden input that submits with the form
    hiddenInput.value = option.dataset.value;

    close();
    trigger.focus();
  }

  // === Focus ===
  function focusOption(index) {
    const wrapped = (index + options.length) % options.length;
    options[wrapped].focus();
  }

  // === Wire up events ===

  // Trigger click → toggle open/close
  trigger.addEventListener("click", toggle);

  // Option click → select
  options.forEach((option) => {
    option.addEventListener("click", () => selectOption(option));
  });

  // Click outside → close
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) {
      close();
    }
  });

  // Escape key → close (and return focus to trigger)
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dropdown.classList.contains("is-open")) {
      close();
      trigger.focus();
    }
  });

  // Accessibility - Open from the trigger
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
      const selected = options.find((o) => o.getAttribute("aria-selected") === "true");
      (selected || options[0]).focus();
    }
  });
  // Keydown on each option
  options.forEach((option, index) => {
    option.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusOption(index + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusOption(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusOption(0);
      } else if (e.key === "End") {
        e.preventDefault();
        focusOption(options.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectOption(option);
      } else if (e.key === "Tab") {
        close();
      }
    });
  });

  // === Initial state ===
  // If a `<li aria-selected="true">` exists in the HTML, sync trigger to match
  const preSelected = options.find((o) => o.getAttribute("aria-selected") === "true");
  if (preSelected) {
    valueDisplay.textContent = preSelected.querySelector(".dropdown-option-label").textContent;
    hiddenInput.value = preSelected.dataset.value;
  }
}

// Initialise every dropdown on the page
document.querySelectorAll("[data-dropdown]").forEach(initDropdown);

/* ============================================
   DROPDOWN (MULTI SELECT)
   ============================================ */

function initMultiSelect(dropdown) {
  // === Element references ===
  const trigger = dropdown.querySelector("[data-dropdown-trigger]");
  const valueDisplay = dropdown.querySelector("[data-dropdown-value]");

  // All real data checkboxes (skip the select-all UI checkbox)
  const checkboxes = Array.from(dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])'));

  // Select-all checkbox (might not exist on every multi-select)
  const selectAll = dropdown.querySelector("[data-select-all]");

  // Remember the initial trigger text — used as the "0 selected" placeholder
  const placeholder = valueDisplay.textContent;

  // === Open / close ===
  function open() {
    dropdown.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function close() {
    dropdown.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function toggle() {
    dropdown.classList.contains("is-open") ? close() : open();
  }

  // === Wire up events ===

  // Trigger click → toggle
  trigger.addEventListener("click", toggle);

  // Click outside → close
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) close();
  });

  // Escape → close, return focus to trigger
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dropdown.classList.contains("is-open")) {
      close();
      trigger.focus();
    }
  });

  // Open from trigger via keyboard
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      // Focus the first focusable element inside (select-all or first option)
      const firstFocusable = selectAll || checkboxes[0];
      if (firstFocusable) firstFocusable.focus();
    }
  });
}

// Initialise every multi-select on the page
document.querySelectorAll("[data-dropdown-multi]").forEach(initMultiSelect);
