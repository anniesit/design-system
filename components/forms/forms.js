/* === Checkbox Indeterminate State (supports nested select-all groups) === */

function setupSelectAll(parent, children) {
  // Guards re-entry while propagating up (updateParent dispatches change on
  // the parent) and down (parent's handler dispatches change on each child).
  // Local to this group's closure, so nested groups each have their own flag.
  let propagating = false;

  // 1. Parent click → set all children, cascading into nested groups
  parent.addEventListener("change", () => {
    if (propagating) return;
    parent.indeterminate = false; // clicking always clears indeterminate
    propagating = true;
    children.forEach((child) => {
      child.checked = parent.checked;
      child.dispatchEvent(new Event("change")); // wakes nested groups
    });
    propagating = false;
  });

  // 2. Any child change → recompute parent
  children.forEach((child) => {
    child.addEventListener("change", () => {
      if (propagating) return;
      updateParent();
    });
  });

  // 3. Compute parent's state from children. Indeterminate children count as
  // "partial" so a nested sub-parent in mixed state pushes the outer parent to
  // indeterminate too. Dispatches change on actual state shift so a containing
  // group's listener (if any) sees this group's new state.
  function updateParent() {
    const checkedCount = children.filter((c) => c.checked).length;
    const indeterminateCount = children.filter((c) => c.indeterminate).length;
    const wasChecked = parent.checked;
    const wasIndeterminate = parent.indeterminate;
    let nextChecked, nextIndeterminate;
    if (checkedCount === 0 && indeterminateCount === 0) {
      nextChecked = false;
      nextIndeterminate = false;
    } else if (checkedCount === children.length) {
      nextChecked = true;
      nextIndeterminate = false;
    } else {
      nextChecked = false;
      nextIndeterminate = true;
    }
    parent.checked = nextChecked;
    parent.indeterminate = nextIndeterminate;
    if (nextChecked !== wasChecked || nextIndeterminate !== wasIndeterminate) {
      propagating = true;
      parent.dispatchEvent(new Event("change"));
      propagating = false;
    }
  }

  // 4. Re-sync on form reset
  const form = parent.closest("form");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(updateParent, 0);
    });
  }

  // Run once on load to set initial state
  updateParent();
}

// === Scoped discovery for nested [data-select-all-group] ===
// A group's parent is the [data-select-all] whose closest group ancestor is
// the group itself. A group's children are [data-select-all-child] in the
// group minus those inside nested groups — except a nested group's own parent
// (carrying both attributes) counts as a single child of the outer.

function findGroupParent(group) {
  return Array.from(group.querySelectorAll("[data-select-all]"))
    .find((el) => el.closest("[data-select-all-group]") === group);
}

function findGroupChildren(group) {
  const groupParent = findGroupParent(group);
  return Array.from(group.querySelectorAll("[data-select-all-child]")).filter((child) => {
    if (child === groupParent) return false; // a group's own parent isn't its child
    const nearestGroup = child.closest("[data-select-all-group]");
    if (nearestGroup === group) return true;
    // Child lives in a nested group: include only if it's that nested group's
    // parent AND the nested group is a direct descendant of this one.
    if (
      child.matches("[data-select-all]") &&
      findGroupParent(nearestGroup) === child
    ) {
      return nearestGroup.parentElement?.closest("[data-select-all-group]") === group;
    }
    return false;
  });
}

// Pre-check data-default-all everywhere first, so nested groups also start
// fully checked before any setupSelectAll reads initial state.
document.querySelectorAll("[data-select-all-group][data-default-all]").forEach((group) => {
  group.querySelectorAll("[data-select-all-child]").forEach((cb) => {
    cb.checked = true;
    cb.setAttribute("checked", "");
  });
});

// Initialise innermost groups first so each outer updateParent reads a settled
// inner state on load.
Array.from(document.querySelectorAll("[data-select-all-group]"))
  .map((group) => {
    let depth = 0;
    let cur = group.parentElement;
    while (cur) {
      if (cur.matches?.("[data-select-all-group]")) depth++;
      cur = cur.parentElement;
    }
    return { group, depth };
  })
  .sort((a, b) => b.depth - a.depth)
  .forEach(({ group }) => {
    const parent = findGroupParent(group);
    const children = findGroupChildren(group);
    if (parent && children.length) {
      setupSelectAll(parent, children);
    }
  });

/* ============================================
   SHARED DROPDOWN BEHAVIOUR (single + multi)
   ============================================
   One outside-click handler + one Escape handler for EVERY dropdown on the
   page, registered once. Previously each dropdown registered its own pair of
   document listeners; with dynamically added/removed rows (component #9) that
   leaked a listener per row. These shared handlers look up whatever dropdown
   is open at event time, so new rows add nothing and removed rows leave
   nothing behind. */

function closeDropdownEl(dropdown) {
  dropdown.classList.remove("is-open");
  const trigger = dropdown.querySelector("[data-dropdown-trigger]");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

// Outside click → close any open dropdown that wasn't clicked inside
document.addEventListener("click", (event) => {
  document
    .querySelectorAll("[data-dropdown].is-open, [data-dropdown-multi].is-open")
    .forEach((dropdown) => {
      if (!dropdown.contains(event.target)) closeDropdownEl(dropdown);
    });
});

// Escape → close every open dropdown and return focus to its trigger
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document
    .querySelectorAll("[data-dropdown].is-open, [data-dropdown-multi].is-open")
    .forEach((dropdown) => {
      closeDropdownEl(dropdown);
      dropdown.querySelector("[data-dropdown-trigger]")?.focus();
    });
});

/* ============================================
   DROPDOWN (SINGLE SELECT)
   ============================================ */

function initDropdown(dropdown) {
  // Guard: safe to call twice on the same element. The anchor row in
  // component #9 is reached by both the load-time sweep and initKeywordFields.
  if (dropdown.dataset.dropdownInit) return;
  dropdown.dataset.dropdownInit = "true";

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
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));

    close();
    trigger.focus();
  }

  // === Focus ===
  // Filter input (if present, via component #11's [data-options-filter])
  // becomes the first focusable item, ahead of the options. Open-via-trigger
  // lands focus on the filter so the user can type to narrow; Arrow Down/Up
  // bridge from filter into the options and skip any hidden by the filter.
  const filterInput = dropdown.querySelector("[data-options-filter]");
  const focusables = [
    ...(filterInput ? [filterInput] : []),
    ...options,
  ];

  function focusFromIndex(currentIndex, direction) {
    const n = focusables.length;
    for (let step = 1; step <= n; step++) {
      const idx = (currentIndex + direction * step + n) % n;
      const item = focusables[idx];
      if (!item.hidden) {
        item.focus();
        return;
      }
    }
  }

  // === Wire up events ===

  // Trigger click → toggle open/close
  trigger.addEventListener("click", toggle);

  // Option click → select
  options.forEach((option) => {
    option.addEventListener("click", () => selectOption(option));
  });

  // NOTE: outside-click + Escape are handled by the shared handlers above.

  // Trigger keyboard open — focus filter if present, else the selected option
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
      if (filterInput) {
        filterInput.focus();
      } else {
        const selected = options.find((o) => o.getAttribute("aria-selected") === "true");
        (selected || options[0]).focus();
      }
    }
  });

  // Keydown on each focusable (filter input + options)
  focusables.forEach((item, index) => {
    item.addEventListener("keydown", (e) => {
      const isOption = item.matches(".dropdown-option");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusFromIndex(index, 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusFromIndex(index, -1);
      } else if (e.key === "Home" && isOption) {
        e.preventDefault();
        focusFromIndex(-1, 1);
      } else if (e.key === "End" && isOption) {
        e.preventDefault();
        focusFromIndex(focusables.length, -1);
      } else if (e.key === "Enter" || e.key === " ") {
        if (isOption) {
          e.preventDefault();
          selectOption(item);
        } else {
          e.preventDefault(); // filter input: don't submit form
        }
      } else if (e.key === "Tab") {
        close();
      }
    });
  });

  // === Initial state & reset handling ===
  const initialPlaceholder = valueDisplay.textContent;
  const initiallySelected = options.find((o) => o.getAttribute("aria-selected") === "true");

  function syncToInitial() {
    options.forEach((o) => {
      o.setAttribute("aria-selected", o === initiallySelected ? "true" : "false");
    });
    if (initiallySelected) {
      valueDisplay.textContent = initiallySelected.querySelector(".dropdown-option-label").textContent;
      hiddenInput.value = initiallySelected.dataset.value;
    } else {
      valueDisplay.textContent = initialPlaceholder;
      hiddenInput.value = "";
    }
  }
  // Run once on load
  syncToInitial();

  // Re-sync on form reset
  const form = dropdown.closest("form");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(syncToInitial, 0);
    });
  }
}

// Initialise every dropdown present at load.
// (Dropdowns inside dynamically-added #9 rows are initialised by initKeywordFields.)
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

  // NOTE: outside-click + Escape are handled by the shared handlers above.

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      focusableItems[0]?.focus();
    }
  });

  // === Keyboard navigation inside the list ===
  // Filter input (if present, via component #11's [data-checkbox-filter])
  // becomes the first focusable item, ahead of select-all and the option
  // checkboxes. Open-via-trigger lands focus here. Arrow Down/Up skip any
  // option hidden by the filter.
  const filterInput = dropdown.querySelector("[data-checkbox-filter]");
  const focusableItems = [
    ...(filterInput ? [filterInput] : []),
    ...(selectAll ? [selectAll] : []),
    ...checkboxes,
  ];

  function focusFromIndex(currentIndex, direction) {
    const n = focusableItems.length;
    for (let step = 1; step <= n; step++) {
      const idx = (currentIndex + direction * step + n) % n;
      const item = focusableItems[idx];
      // Filter input has no .checkbox wrapper, so it's never considered hidden.
      const wrapper = item.closest(".checkbox");
      if (!(wrapper && wrapper.hidden)) {
        item.focus();
        return;
      }
    }
  }

  focusableItems.forEach((item, index) => {
    item.addEventListener("keydown", (e) => {
      const isCheckbox = item.type === "checkbox";
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusFromIndex(index, 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusFromIndex(index, -1);
      } else if (e.key === "Home" && isCheckbox) {
        e.preventDefault();
        focusFromIndex(-1, 1);
      } else if (e.key === "End" && isCheckbox) {
        e.preventDefault();
        focusFromIndex(focusableItems.length, -1);
      } else if (e.key === "Enter") {
        if (isCheckbox) {
          e.preventDefault();
          item.checked = !item.checked;
          item.dispatchEvent(new Event("change"));
        } else {
          e.preventDefault(); // filter input: don't submit form
        }
      }
    });
  });

  // === Close when keyboard focus leaves the dropdown ===
  // (Separate from outside-click: handles Tab-out. macOS dumps focus on
  // document.body when clicking a checkbox, so track mouseInside too.)
  let mouseInside = false;

  dropdown.addEventListener("mousedown", () => {
    mouseInside = true;
  });

  dropdown.addEventListener("focusout", () => {
    setTimeout(() => {
      if (mouseInside) {
        mouseInside = false;
        return;
      }
      if (!dropdown.contains(document.activeElement)) {
        close();
      }
    }, 0);
  });

  // === Initial state ===

  // 1. Apply default-all if attribute is present
  if (dropdown.hasAttribute("data-default-all")) {
    checkboxes.forEach((cb) => {
      cb.checked = true;
      cb.setAttribute("checked", "");
    });
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

  // 5. Re-sync trigger on form reset
  const form = dropdown.closest("form");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(updateTriggerDisplay, 0);
    });
  }
}

// Initialise every multi-select on the page
document.querySelectorAll("[data-dropdown-multi]").forEach(initMultiSelect);

/* ============================================
   CLEAR ALL
   ============================================
   The reset button's visibility mode is set by the value of data-clear-all:

     data-clear-all                 → show-on-input (default): the button starts
     data-clear-all="show-on-input"   hidden, appears on first input, hides on reset.
     data-clear-all="always"        → always visible: JS never touches visibility
                                      (markup controls it).

   Default (bare attribute) preserves the original show-on-input behaviour, so
   existing projects keep working when this file is re-copied in. */

document.querySelectorAll("form").forEach((form) => {
  const clearBtn = form.querySelector("[data-clear-all]");
  if (!clearBtn) return;

  // "always" → leave visibility alone
  if (clearBtn.dataset.clearAll === "always") return;

  // show-on-input
  clearBtn.hidden = true; // start hidden (no need for `hidden` in markup)
  form.addEventListener("input", () => {
    clearBtn.hidden = false;
  });
  form.addEventListener("reset", () => {
    clearBtn.hidden = true;
  });
});

/* ============================================
   DATE RANGE
   ============================================ */

function initDateRange(container) {
  const startInput = container.querySelector("[data-date-start]");
  const endInput = container.querySelector("[data-date-end]");
  if (!startInput || !endInput) return;

  // Snapshot the initial min/max so we can restore them on reset
  const initialStartMin = startInput.min;
  const initialStartMax = startInput.max;
  const initialEndMin = endInput.min;
  const initialEndMax = endInput.max;

  // Keep start ≤ end by linking the two inputs' min/max
  function syncConstraints() {
    // The end can't be before the start
    endInput.min = startInput.value || initialEndMin;
    // The start can't be after the end
    startInput.max = endInput.value || initialStartMax;
  }

  function resetConstraints() {
    startInput.min = initialStartMin;
    startInput.max = initialStartMax;
    endInput.min = initialEndMin;
    endInput.max = initialEndMax;
  }

  // Wire change listeners
  startInput.addEventListener("change", syncConstraints);
  endInput.addEventListener("change", syncConstraints);

  // Reset handling
  const form = container.closest("form");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(resetConstraints, 0);
    });
  }

  // Run once on load so any pre-filled values constrain each other
  syncConstraints();
}

document.querySelectorAll("[data-date-range]").forEach(initDateRange);

/* ============================================
   INPUT CLEAR (Component #10 — × button inside a text input)
   ============================================
   Pairs with any text input via a wrapper containing the input + the button.
   Button shows when the input has a value, hides when empty. Click clears the
   input, dispatches `input` (so form-level listeners like clear-all see the
   change) and refocuses the input. Idempotent — safe to wire twice (e.g. by
   the load-time sweep AND by initKeywordFields on a freshly cloned row). */

function initInputClear(button) {
  if (button.dataset.inputClearInit) return;
  button.dataset.inputClearInit = "true";

  const input = button.parentElement?.querySelector("input");
  if (!input) return;

  function sync() {
    button.hidden = input.value === "";
  }

  input.addEventListener("input", sync);

  button.addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });

  const form = input.closest("form");
  if (form) {
    form.addEventListener("reset", () => setTimeout(sync, 0));
  }

  sync(); // initial state
}

document.querySelectorAll("[data-input-clear]").forEach(initInputClear);

/* ============================================
   FILTERABLE LISTS (Component #11)
   ============================================
   Hide/show items inside a container based on substring match against a label
   text (case-insensitive, Unicode/CJK-safe). Two variants share one engine:

     [data-filterable-checkboxes] + [data-checkbox-filter] → checkbox lists
       (fieldsets and multi-select dropdowns). Select-all is never hidden.
     [data-filterable-options]    + [data-options-filter]  → single-select
       dropdown option lists.

   Hidden-but-checked items still submit. The select-all parent's logic is
   unchanged — it still toggles ALL children regardless of visibility, by
   design, so a checked-then-hidden selection survives further filtering. */

function setupFilter(container, opts) {
  const filterInput = container.querySelector(opts.filterInputSelector);
  if (!filterInput) return;

  // Items to filter, optionally narrowed (e.g. exclude the select-all wrapper).
  const items = Array.from(container.querySelectorAll(opts.itemSelector))
    .filter(opts.itemFilter || (() => true));

  // Decorative elements (e.g. group dividers) that carry no label: hide them
  // whenever a query is active, restore them when the input is cleared.
  const decorations = opts.decorationSelector
    ? Array.from(container.querySelectorAll(opts.decorationSelector))
    : [];

  function applyFilter() {
    const query = filterInput.value.trim().toLowerCase();
    items.forEach((item) => {
      const label = item.querySelector(opts.labelSelector)?.textContent.toLowerCase() ?? "";
      item.hidden = query !== "" && !label.includes(query);
    });
    decorations.forEach((el) => { el.hidden = query !== ""; });
  }

  filterInput.addEventListener("input", applyFilter);

  const form = container.closest("form");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(() => {
        filterInput.value = "";
        applyFilter();
      }, 0);
    });
  }
}

// Checkbox lists (fieldsets and multi-select dropdowns). Select-all excluded.
document.querySelectorAll("[data-filterable-checkboxes]").forEach((c) =>
  setupFilter(c, {
    filterInputSelector: "[data-checkbox-filter]",
    itemSelector: ".checkbox",
    labelSelector: ".checkbox-label",
    itemFilter: (cb) => !cb.querySelector("[data-select-all]"),
    decorationSelector: "[data-filter-decor]",
  })
);

// Single-select dropdown option lists.
document.querySelectorAll("[data-filterable-options]").forEach((c) =>
  setupFilter(c, {
    filterInputSelector: "[data-options-filter]",
    itemSelector: ".dropdown-option",
    labelSelector: ".dropdown-option-label",
  })
);

/* ============================================
   KEYWORD FIELDS (Component #9 — Add field)
   ============================================
   A repeatable query-row builder for the keyword search section.

   Structure (see markup file):
     [data-keyword-fields]                 container / scoping marker
       data-min-fields / data-max-fields   row limits (default 2 / 5)
       [data-keyword-row]                   row 1 — STATIC ANCHOR (field + input,
                                            no operator, no +/- buttons)
       <template data-keyword-row-template> source for rows 2–5
         [data-keyword-row]                 operator + field + input + add/remove

   Submission naming: every submitting field carries a base name in data-name
   (operator / field / keyword). On every change JS rewrites the real `name` to
   an indexed form — keyword_1, then operator_2/field_2/keyword_2, … — so the
   backend receives positionally-grouped, gap-free rows. (Row 1 has no operator,
   which is exactly why indexed names beat parallel arrays.)

   Reset: native form.reset() restores values but does NOT remove JS-added rows,
   so the reset handler tears the DOM back down to the default count. */

function initKeywordFields(container) {
  const template = container.querySelector("[data-keyword-row-template]");
  if (!template) return;

  const min = parseInt(container.dataset.minFields, 10) || 2;
  const max = parseInt(container.dataset.maxFields, 10) || 5;

  const rows = () => Array.from(container.querySelectorAll("[data-keyword-row]"));

  // Re-index submitting names + refresh add/remove disabled states.
  // Runs after any add/delete so indices stay contiguous (1-based).
  function renumber() {
    const all = rows();
    all.forEach((row, i) => {
      const index = i + 1;
      row.querySelectorAll("[data-name]").forEach((field) => {
        field.name = `${field.dataset.name}_${index}`;
      });
    });
    const count = all.length;
    all.forEach((row) => {
      const add = row.querySelector("[data-keyword-add]");
      const remove = row.querySelector("[data-keyword-remove]");
      if (add) add.disabled = count >= max;
      if (remove) remove.disabled = count <= min;
    });
  }

  // Clone one repeatable row from the template and wire its dropdowns.
  // `after` = the row to insert behind (defaults to the last row).
  // `focus` = move focus to the new row's keyword input (skip on load).
  function insertRow({ after = null, focus = true } = {}) {
    if (rows().length >= max) return null;

    const row = template.content.firstElementChild.cloneNode(true);
    (after || rows()[rows().length - 1]).after(row);

    // Reuse the existing single-select component for the new row's dropdowns,
    // and wire the row's input-clear button (if present).
    row.querySelectorAll("[data-dropdown]").forEach(initDropdown);
    row.querySelectorAll("[data-input-clear]").forEach(initInputClear);

    renumber();
    if (focus) row.querySelector("[data-name='keyword']")?.focus();
    return row;
  }

  function removeRow(row) {
    if (rows().length <= min) return;
    // Move focus off the row before it's removed (keyboard accessibility).
    const prev = row.previousElementSibling;
    row.remove();
    renumber();
    (prev?.querySelector("[data-name='keyword']") ||
      container.querySelector("[data-name='keyword']"))?.focus();
  }

  // === Event delegation ===
  // One listener on the stable container handles +/- for current AND future
  // rows. (Disabled buttons don't fire clicks, so limits are enforced for free;
  // the guards in insert/removeRow are belt-and-suspenders.)
  container.addEventListener("click", (event) => {
    const addBtn = event.target.closest("[data-keyword-add]");
    if (addBtn) {
      insertRow({ after: addBtn.closest("[data-keyword-row]") });
      return;
    }
    const removeBtn = event.target.closest("[data-keyword-remove]");
    if (removeBtn) {
      removeRow(removeBtn.closest("[data-keyword-row]"));
    }
  });

  // === Initial state ===
  // Wire dropdowns already in the markup (the anchor row), top up to the
  // minimum row count from the template, then index everything.
  container.querySelectorAll("[data-keyword-row] [data-dropdown]").forEach(initDropdown);
  while (rows().length < min) insertRow({ focus: false });
  renumber();

  // === Reset: tear extra rows back down to the default count ===
  const form = container.closest("form");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(() => {
        rows().slice(min).forEach((row) => row.remove()); // drop rows beyond min
        renumber();
        // Kept rows' values + dropdowns re-sync via native reset and each
        // dropdown's own reset listener.
      }, 0);
    });
  }
}

document.querySelectorAll("[data-keyword-fields]").forEach(initKeywordFields);
