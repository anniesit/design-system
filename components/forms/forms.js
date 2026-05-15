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

// Use it like this:
const parent = document.querySelector("[data-select-all]");
const children = document.querySelectorAll("[data-select-all-child]");
setupSelectAll(parent, Array.from(children));

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
