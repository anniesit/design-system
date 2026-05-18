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
  const checkboxes = Array.from(dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])'));
  const selectAll = dropdown.querySelector("[data-select-all]");
  const placeholder = valueDisplay.textContent;

  // === Helper functions ===
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

  function updateTriggerDisplay() {
    const checked = checkboxes.filter((cb) => cb.checked);

    if (checked.length === 0) {
      valueDisplay.textContent = placeholder;
    } else if (checked.length === checkboxes.length && checkboxes.length > 1) {
      valueDisplay.textContent = `All (${checked.length})`;
    } else if (checked.length === 1) {
      const label = checked[0].closest(".checkbox").querySelector(".checkbox-label").textContent;
      valueDisplay.textContent = label;
    } else {
      valueDisplay.textContent = `${checked.length} selected`;
    }
  }

  // === Event wiring ===
  trigger.addEventListener("click", toggle);

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dropdown.classList.contains("is-open")) {
      close();
      trigger.focus();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      const firstFocusable = selectAll || checkboxes[0];
      if (firstFocusable) firstFocusable.focus();
    }
  });

  // === Keyboard navigation inside the list ===
  const focusableItems = selectAll ? [selectAll, ...checkboxes] : checkboxes;

  function focusItem(index) {
    const wrapped = (index + focusableItems.length) % focusableItems.length;
    focusableItems[wrapped].focus();
  }

  focusableItems.forEach((item, index) => {
    item.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusItem(index + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusItem(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusItem(0);
      } else if (e.key === "End") {
        e.preventDefault();
        focusItem(focusableItems.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        item.checked = !item.checked;
        item.dispatchEvent(new Event("change"));
      }
    });
  });

  // === Close when keyboard focus leaves the dropdown ===
  dropdown.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!dropdown.contains(document.activeElement)) {
        close();
      }
    }, 0);
  });

  // === Initial state ===

  // 1. Apply default-all if attribute is present
  if (dropdown.hasAttribute("data-default-all")) {
    checkboxes.forEach((cb) => (cb.checked = true));
  }

  // 2. Wire select-all (its internal syncParent runs at the end of setup)
  if (selectAll) {
    setupSelectAll(selectAll, checkboxes);
  }

  // 3. Wire trigger-display listeners on every checkbox
  const allBoxes = selectAll ? [selectAll, ...checkboxes] : checkboxes;
  allBoxes.forEach((cb) => {
    cb.addEventListener("change", updateTriggerDisplay);
  });

  // 4. Initial trigger render
  updateTriggerDisplay();
}

// Initialise every multi-select on the page
document.querySelectorAll("[data-dropdown-multi]").forEach(initMultiSelect);
