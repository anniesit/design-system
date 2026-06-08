# MAST Fork — Design System Handoff

A custom-coded, framework-agnostic form component system. Drop-in via `<link>` and `<script>` — no framework dependency, no Webflow runtime, works in any HTML environment.

---

## What's in the box

- `all.css` — styles for all components and utilities.
- `all.js` — component behavior.

Each project holds its **own copy** of these two files. There is no live shared dependency — updates propagate by re-copying when desired. This intentionally trades auto-propagation for stability: each project pins its own known-good version.

## Installation

Copy `all.css` and `all.js` into the project and include them in the document:

```html
<link rel="stylesheet" href="all.css">
<script src="all.js" defer></script>
```

**Do not** use `@import` with cascade layers — that has caused conflicts in Webflow.

---

## Naming conventions

All markup follows these conventions. **JS hooks are `data-*` attributes; classes are styling-only.**

| Thing | Convention | Example |
|---|---|---|
| Component class | single-hyphen kebab-case, no BEM | `.dropdown-trigger` |
| Utility class | `cc-` prefix (Client-First style) | `.cc-stretch`, `.cc-w-auto` |
| State class | `is-` prefix (JS-toggled) | `.is-open`, `.is-error`, `.is-disabled` |
| JS hook | `data-*` attribute | `data-dropdown-trigger` |
| `name` attribute | snake_case | `name="search_area"` |
| `id` (when needed) | kebab-case with prefix | `id="search-keywords"` |

## Scoping

Components that own child elements use a container marker; their JS queries are scoped to the container, so multiple instances on a page stay independent.

| Component | Container marker |
|---|---|
| Single-select dropdown | `[data-dropdown]` |
| Multi-select dropdown | `[data-dropdown-multi]` |
| Standalone select-all group | `[data-select-all-group]` |
| Date range | `[data-date-range]` |
| Keyword fields (add-field) | `[data-keyword-fields]` |

---

## Components

### 1. Keyword search input

Native `<input type="search">`. No JS hooks — semantic only.

```html
<input type="search" name="keywords" aria-label="Search">
```

### 2. Radio

Native `<input type="radio">`. Group with `<fieldset>` + `<legend>`.

```html
<fieldset>
  <legend>Choose one</legend>
  <label><input type="radio" name="choice" value="a"> A</label>
  <label><input type="radio" name="choice" value="b"> B</label>
</fieldset>
```

### 3. Checkbox + select-all

Native checkboxes. Wrap a parent + its children with `[data-select-all-group]` for indeterminate-aware select-all behavior.

```html
<fieldset data-select-all-group>
  <legend>Tags</legend>
  <label><input type="checkbox" data-select-all> All</label>
  <label><input type="checkbox" data-select-all-child name="tag" value="a"> A</label>
  <label><input type="checkbox" data-select-all-child name="tag" value="b"> B</label>
</fieldset>
```

The parent reflects child state: all checked → checked; some → indeterminate; none → unchecked. Clicking the parent toggles all children.

### 4. Single-select dropdown

Custom listbox-pattern dropdown. Submits via a hidden input.

```html
<div data-dropdown class="dropdown">
  <button type="button" data-dropdown-trigger aria-haspopup="listbox" aria-expanded="false">
    <span data-dropdown-value>Placeholder</span>
  </button>
  <input type="hidden" name="search_area">
  <ul role="listbox" class="dropdown-list">
    <li role="option" aria-selected="true"  data-value="all"   data-dropdown-option class="dropdown-option">
      <span data-dropdown-option-label class="dropdown-option-label">All</span>
    </li>
    <li role="option" aria-selected="false" data-value="title" data-dropdown-option class="dropdown-option">
      <span data-dropdown-option-label class="dropdown-option-label">Title</span>
    </li>
  </ul>
</div>
```

- The option with `aria-selected="true"` is the default; the hidden input gets that option's `data-value` on load.
- Keyboard: Arrow keys, Home/End, Enter/Space to select, Escape to close, Tab to commit and leave.
- Outside click and Escape close every open dropdown on the page (one shared handler).

### 5. Multi-select dropdown

Same shell as single-select, but the list contains real checkboxes. Submits multiple `name=value` pairs natively.

```html
<div data-dropdown-multi class="dropdown" data-default-all>
  <button type="button" data-dropdown-trigger aria-haspopup="listbox" aria-expanded="false">
    <span data-dropdown-value>Filter</span>
  </button>
  <ul class="dropdown-list">
    <li class="checkbox"><label><input type="checkbox" data-select-all> <span class="checkbox-label">All</span></label></li>
    <li class="checkbox"><label><input type="checkbox" name="genre" value="drama"> <span class="checkbox-label">Drama</span></label></li>
    <li class="checkbox"><label><input type="checkbox" name="genre" value="noir">  <span class="checkbox-label">Noir</span></label></li>
  </ul>
</div>
```

- Trigger label reflects current state: placeholder / single label / `N selected` / `All (N)`.
- Optional `data-default-all` on the container: every option starts checked.
- Optional `[data-select-all]` checkbox inside the list for an indeterminate "All" toggle.

### 6. Search (submit) button

Native `<button type="submit">`. Pressing Enter in any text input also submits.

```html
<button type="submit">Search</button>
```

### 7. Clear all (reset button)

Native `<button type="reset">` with `data-clear-all`. Two visibility modes:

```html
<!-- Hidden until the user types/selects something; hides again on reset -->
<button type="reset" data-clear-all>Clear</button>

<!-- Always visible -->
<button type="reset" data-clear-all="always">Clear</button>
```

Resets all form values to their HTML-declared defaults. Every component re-syncs its own visual state on the form's `reset` event.

### 8. Date range

Two native `<input type="date">` in a fieldset, linked via `min` / `max` so start ≤ end.

```html
<fieldset data-date-range>
  <legend>Date range</legend>
  <label>Start <input type="date" data-date-start name="start_date" min="…" max="…"></label>
  <label>End   <input type="date" data-date-end   name="end_date"   min="…" max="…"></label>
</fieldset>
```

Frontend submits ISO dates (`YYYY-MM-DD`). If the backend stores dates differently (e.g., separate year/month/day columns), it transforms on its side. Set `min` and `max` to the project's actual date bounds.

### 9. Add field (keyword query rows)

Repeatable query-row builder. One static anchor row (field dropdown + keyword input, no operator, no +/−) plus 1–N repeatable rows (operator + field + keyword + per-row +/−).

```html
<div data-keyword-fields data-min-fields="2" data-max-fields="5" class="keyword-fields">

  <!-- Row 1: static anchor — no operator, no +/− -->
  <div data-keyword-row class="keyword-row">
    <div data-dropdown class="dropdown">…field-scope dropdown…<input type="hidden" data-name="field"></div>
    <input type="search" data-name="keyword" aria-label="Search">
  </div>

  <!-- Default visible row 2 — same markup as the template below -->
  <div data-keyword-row class="keyword-row">
    <div data-dropdown class="dropdown">…operator dropdown…<input type="hidden" data-name="operator"></div>
    <div data-dropdown class="dropdown">…field-scope dropdown…<input type="hidden" data-name="field"></div>
    <input type="search" data-name="keyword" aria-label="Search">
    <button type="button" data-keyword-add aria-label="Add">+</button>
    <button type="button" data-keyword-remove aria-label="Remove">−</button>
  </div>

  <!-- Template for cloned rows 3..N -->
  <template data-keyword-row-template>
    <div data-keyword-row class="keyword-row">… same as default row 2 …</div>
  </template>

</div>
```

- `data-min-fields` and `data-max-fields` default to 2 and 5 if omitted.
- **Submitting inputs use `data-name`, not `name`.** Values are `operator`, `field`, `keyword`. JS assigns the real `name` as an indexed string — `field_1`, `keyword_1`, then `operator_2`/`field_2`/`keyword_2`, and so on — on every add/delete. Do not hardcode `name` attributes.
- Per-row `+` appends a row after itself; `−` deletes its own row. Buttons set the native `disabled` attribute at the min/max limits — style hover with `:not(:disabled):hover`.
- Native `<button type="reset">` returns to the default row count.

**Webflow note:** `<template>` elements can't be produced by the visual designer. Put the template inside an HTML Embed. The visible default row 2 (Webflow elements) and the embedded `<template>` carry the same row markup — keep them in sync if you change the row structure.

### 10. Input clear (× button inside a text input)

Pairs with any text input. The button appears when the input has a value, disappears when empty, and on click clears + refocuses the input.

```html
<div class="input-clear-wrapper">
  <input type="search" name="…" class="input">
  <button type="button" data-input-clear class="input-clear-btn" aria-label="Clear" hidden>
    <!-- × icon: text, SVG, or Phosphor span -->
  </button>
</div>
```

- The wrapper must contain exactly one `<input>` and the button (the JS finds the input via `button.parentElement.querySelector("input")`).
- `hidden` in the markup is the recommended starting state — JS sets it correctly from the input's current value on load anyway.
- CSS: make the wrapper a flex container or `position: relative` with the button absolutely positioned at the right; give the input enough right padding to clear the button. Hide the WebKit native search clear (`input[type="search"]::-webkit-search-cancel-button { display: none; }`) so you don't get two × symbols.
- Works inside #9 rows automatically — `initKeywordFields` calls `initInputClear` on each cloned row's button.
- Clearing dispatches an `input` event that bubbles to the form, so the form-level clear-all (in show-on-input mode) sees the change.

### 11. Filterable checkboxes

Adds a text input inside a checkbox fieldset that hides/shows options by substring match. For long lists (100+) — case-insensitive, CJK-safe.

```html
<fieldset data-select-all-group data-filterable-checkboxes class="field-group">
  <legend class="field-legend">作者</legend>

  <input type="search" data-checkbox-filter class="checkbox-filter-input"
         placeholder="輸入篩選…" aria-label="Filter">

  <!-- Select-all (never hidden by the filter) -->
  <label class="checkbox is-w-full">
    <input type="checkbox" data-select-all class="checkbox-input">
    <span class="checkbox-control">…</span>
    <span class="checkbox-label">Select All</span>
  </label>

  <!-- Options (typically injected by the backend) -->
  <label class="checkbox is-w-full">
    <input type="checkbox" name="author" data-select-all-child class="checkbox-input" value="…">
    <span class="checkbox-control">…</span>
    <span class="checkbox-label">陳豪賢</span>
  </label>
  …
</fieldset>
```

- Marker `data-filterable-checkboxes` on the fieldset. Coexists with `data-select-all-group` — the two are orthogonal.
- The filter operates on the `.checkbox-label` text. The select-all wrapper is never hidden.
- Hidden-but-checked items still submit. Users can filter, check, filter again — earlier selections persist.
- Reset on form `reset`: filter input clears, all options reappear.
- Select-all behavior is **unchanged** — it still toggles ALL children, including currently-hidden ones. This is deliberate so a checked selection survives filter changes. If you find users want "select all visible only," that's a future extension, not the default.
- Optional: wrap the filter input itself in `.input-clear-wrapper` to give it a × clear button (component #10).

---

## Form patterns

### Single form (default)

One `<form method="get">` wrapping everything. Submit produces a URL with all params; reset clears everything.

### Multiple forms on one page

When sections need independent clear and submit (e.g., keyword search vs. filter sidebar), use multiple `<form>` elements. Every component scopes via `closest("form")`, so this works with no JS changes. Each form's clear-all resets only its own fields; each form's submit only carries its own params.

Combining params across forms (if both sections should AND together in one query) is the backend's responsibility — see the contract below.

---

## Backend contract

The frontend submits the user's **intent** in standard form. The backend interprets storage shape.

- **Empty values = no constraint.** GET submits empty controls as present-but-empty (`keyword_1=`). Treat empty/missing as "match all on this field."
- **Combination logic:**
  - AND across different fields.
  - OR within a multi-select (multiple values of the same `name`).
  - AND across multiple `<form>` sections on the same page; the backend is responsible for persisting state across the two submits.
- **Indexed names** for repeatable rows where position matters (#9): `field_1`, `keyword_1`, then `operator_2`/`field_2`/`keyword_2`, … Indices are always contiguous and gap-free, regardless of add/delete order.
- **Frontend owns:** `type`, `name` (proposes), structure, semantics, ARIA.
  **Backend owns:** `action`, processing, validation, storage transformation, ID assignment if needed by her form library.
- **`name` values are snake_case.** Frontend proposes; backend confirms.

### Example submission

```
?field_1=all&keyword_1=ozu
 &operator_2=AND&field_2=title&keyword_2=tokyo+story
 &operator_3=OR&field_3=author&keyword_3=
```

Row 1 (anchor, no operator) → row 2 → row 3. Empty `keyword_3=` means "no constraint on row 3."

---

## Known trade-offs

- **Native date input rendering varies by OS.** Calendar UI differs across browsers/devices. Accepted in exchange for accessibility and zero JS.
- **Single-select dropdown max-height is asymmetric** at the top vs. bottom edge by a small amount. Visible only in unusual viewport positions; accepted.
- **Removed #9 rows leak their dropdown reset listeners.** Bounded by max-rows (5) and rare reset events; impact is negligible.
- **Webflow renders empty `value=""` attributes as `value="undefined"`.** Cosmetic only — JS sets the actual property correctly. Use an HTML Embed for clean markup if it matters.

---

## Pre-flight checklist for a new project

- [ ] `all.css` and `all.js` copied into the project and included via `<link>` / `<script>`.
- [ ] All single-select dropdown markup uses `data-dropdown-option` and `data-dropdown-option-label` (not class selectors). JS queries by data attribute — markup that selects options only by class will throw.
- [ ] All `name` attributes confirmed with the backend.
- [ ] Date range `min` and `max` set to the project's actual date bounds.
- [ ] If using multiple forms on a page: backend has been briefed on the AND-combine contract.
- [ ] Cross-browser/device check (especially native date inputs).
- [ ] Each form's clear-all resets its section cleanly (dropdown trigger labels, multi-select indeterminate state, date constraints, #9 row count).
