# Smoke checklist

Two ways to check a page: **script** (`verify.js`, in this folder) catches
structural/accessibility facts about the DOM. This file covers everything a
script can't see — visual correctness, feel, judgment calls. Run both when
you build or touch a component; neither replaces the other.

Not every project uses every component — only check the ones actually on
the page.

## Nav

- [ ] Exactly one nav link has the "current page" look, and it's the right one
- [ ] Mobile hamburger opens with one tap, closes with one tap (not two)
- [ ] Resizing the window across the mobile breakpoint doesn't leave the
      menu open-but-invisible or duplicated
- [ ] Skip-link (usually the first Tab stop) actually moves focus to `<main>`
      when activated
- [ ] Dropdown submenus (if any) open on click/tap and close on outside click
      or Escape

## Dropdown (single or multi-select)

- [ ] Trigger label reflects the real state (placeholder / selected value /
      "N selected")
- [ ] Arrow keys move through options; Enter/Space selects; Escape closes
- [ ] Clicking outside closes it
- [ ] If it has a filter input: typing narrows the list, and a previously
      checked-but-now-hidden item is still counted as selected

## Table rows (table-rowlink)

- [ ] Clicking anywhere in a row navigates to that row's page
- [ ] The table still scrolls sideways on a real iPad (not just desktop —
      this is the one that silently breaks)
- [ ] cmd/ctrl-click opens in a new tab instead of navigating in place
- [ ] Screen reader announces something meaningful for the row link (its
      identifying text), not just "link"

## Accordion

- [ ] Only the intended panel(s) are open by default
- [ ] Opening one panel doesn't unexpectedly close a sibling (unless that's
      the intended single-open behavior)
- [ ] Keyboard: Tab reaches the summary, Enter/Space toggles it

## Tabs

- [ ] Exactly one tab is marked active/selected at a time
- [ ] Clicking a tab shows its pane and hides the others
- [ ] On mobile (if it collapses to a dropdown): switching still works and
      the label updates

## TOC / scroll-to

- [ ] Clicking a TOC link scrolls to the right section, landing below the
      sticky nav (not hidden under it)
- [ ] Scrolling the page highlights the correct TOC entry as you pass each
      section
- [ ] On mobile (if it becomes a dropdown): the trigger label updates as you
      scroll

## Images / notation / any lazy content

- [ ] No visible layout jump when an image finishes loading
- [ ] Broken/missing image shows a sensible fallback, not a raw broken-image
      icon in the middle of the layout

## General, every page

- [ ] Tab through the whole page once — nothing is skipped, nothing traps focus
- [ ] Page still works with the design-system CSS/JS loaded from the
      project's own copy, not the live CDN link (catches "it only worked
      because I was on the shared link" bugs)
- [ ] Test on a real touch device if the page has anything horizontally
      scrollable — desktop + iPhone + iPad can each behave differently
      (this project's iPad-only table-scroll bug is why this line exists)
