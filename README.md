# Design System

A personal design system based on [MAST](https://github.com/nocodesupplyco/mast) by No-Code Supply Co, organized for use across multiple Webflow projects via jsDelivr CDN.

## Folder structure

```
design-system/
├── README.md
├── cjk-setting.css              # Typography token TEMPLATE — not in bundle.
│                                # Duplicate this per project and customise
│                                # (fonts, heading sizes, line heights, etc.)
├── global/                      # Site-wide styles & scripts — all included in bundle
│   ├── global.css               # Base styles, helpers, modifiers
│   └── global.js                # Font-size accessibility, footer year, aria-current
├── components/                  # One folder per component
│   ├── theme-toggle/
│   │   ├── theme-toggle.css
│   │   └── theme-toggle.js      # placeholder — see file
│   ├── forms/
│   │   └── forms.css
│   ├── icons/
│   │   └── icons.css            # MAST uses Phosphor Icons via unpkg CDN
│   ├── marquee/
│   │   └── marquee.css
│   ├── accordion/
│   │   ├── accordion.css
│   │   └── accordion.js         # placeholder
│   ├── modal/
│   │   ├── modal.css
│   │   └── modal.js             # placeholder
│   ├── slider/
│   │   ├── slider.css           # MAST custom CSS (Swiper loaded externally)
│   │   └── slider.js            # placeholder
│   ├── inline-video/
│   │   ├── inline-video.css     # no MAST CSS — file kept for future use
│   │   └── inline-video.js      # placeholder
│   ├── tabs/
│   │   ├── tabs.css
│   │   └── tabs.js              # placeholder
│   └── nav/
│       ├── nav.css              # mobile menu, dropdown, scroll lock
│       └── nav.js               # skip-link accessibility helper
└── bundles/                     # Combined files for projects (TBD)
    ├── all.css
    └── all.js
```

## What's been extracted

All inline `<style>` and `<script>` blocks from MAST's exported `components.html`
have been moved into the files above, **without modification**. Each file matches
the grouping that appears in Webflow's Global Custom Code panel.

## JS source files

All component JS has been extracted from MAST's CDN and committed directly
into this repo. The source for each component is in its folder alongside the CSS.
The `tabs.js` file is a custom build with accessibility improvements over the
original MAST source.

## External dependencies (not forked)

These come from third-party CDNs and stay there:

- **Phosphor Icons** — `https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css`
- **Swiper CSS** — `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css`
- **Swiper JS** — `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js`

## License & attribution

This system is derived from MAST by No-Code Supply Co. Check MAST's repo for
licensing terms.

## Linking the files

Always use a version tag, never `@main`. Tagged URLs are permanently cached on
jsDelivr and never need purging. `@main` can serve stale content for up to 7 days.

```html
<!-- In Webflow Project Settings → Custom Code → Head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/anniesit/design-system@0.2.0/bundles/all.css">

<!-- In Webflow Project Settings → Custom Code → Before </body> -->
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/anniesit/design-system@0.2.0/bundles/all.js" defer></script>
```

For the Webflow designer to load styles, also add these inside a `w-embed` block
in the canvas (e.g. inside the `custom-code-component`):

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/anniesit/design-system@0.2.0/bundles/all.css">
```

## Per-project configuration (DS_CONFIG)

The bundle reads from `window.DS_CONFIG` if it exists. Set this in a `<script>`
block **before** `all.js` loads to override defaults for a specific project or page.

```html
<script>
  window.DS_CONFIG = {
    themeKey:      'my-project-theme',  // localStorage key for dark/light mode
    navBreakpoint: 992,                 // mobile nav reset breakpoint in px
    tocBreakpoint: 992                  // breakpoint at which TOC becomes a dropdown
  };
</script>
```

| Option | Default | What it controls |
|---|---|---|
| `themeKey` | `'savedTheme'` | localStorage key for the theme toggle. **Must be unique per project on shared domains** to prevent one project's theme setting overriding another's |
| `navBreakpoint` | `992` | Pixel width at which the mobile nav state resets on window resize |
| `tocBreakpoint` | `992` | Pixel width below which the TOC becomes a dropdown, adding its height to scroll-to-anchor offset calculations |

**Setting per page in Webflow:** each page has its own Page Settings → Custom Code
fields. Put the `DS_CONFIG` script there to override settings on specific pages
without affecting others.

**You only need to set the values that differ from defaults.** Omitted keys fall
back to the defaults shown above.

## Per-project typography

`cjk-setting.css` at the repo root is a template for typography tokens — fonts,
heading sizes, line heights, weights, letter spacing. It is **not included in
the bundle** and must be set up separately for each project:

1. Duplicate `cjk-setting.css` into your project folder
2. Rename and customise it for that project's typeface and scale
3. Link it in Webflow **after** `all.css` so its variables take effect:

```html
<link rel="stylesheet" href="...all.css">
<link rel="stylesheet" href="[your-project-typography.css]">
```

Variables in this file override the defaults set in MAST's base CSS.

## Release workflow

Every time you change source files and want them live:

```bash
# 1. Rebuild the bundles
bash build.sh

# 2. Commit source files and bundles together
git add -A
git commit -m "your message"
git push

# 3. Tag the release
git tag v0.3.0
git push origin v0.3.0
```

Then in Webflow, update the version number in all CDN links (`@0.2.0` → `@0.3.0`)
and republish the site. Each project can be updated independently on its own schedule.