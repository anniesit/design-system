/* Checkbox Indetermined State */

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
