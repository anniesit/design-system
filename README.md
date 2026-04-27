# Design System

A personal design system based on [MAST](https://github.com/nocodesupplyco/mast) by No-Code Supply Co, organized for use across multiple Webflow projects via jsDelivr CDN.

## Folder structure

```
design-system/
├── README.md
├── global/                      # Site-wide styles & scripts
│   ├── canvas-modifiers.css     # Webflow Designer canvas-only styles
│   ├── global.css               # Site-wide base styles, helpers, modifiers
│   └── global.js                # Font-size accessibility, footer year
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

## JS placeholder files

The components Theme Toggle, Accordion, Modal, Slider, Inline Video, and Tabs
have JavaScript that lives on MAST's own jsDelivr CDN — that JS was never
inline in the HTML. The `.js` files in those component folders are placeholders
explaining where the source code is and how to populate them if you want to
fork the JS into your own repo.

You have two options:

1. **Reference MAST's CDN directly** in your Webflow projects (don't fork the JS).
   Easier, but you can't modify the JS or pin a version under your control.
2. **Fork the JS into this repo** by visiting each MAST CDN URL, copying the
   source, and committing it. More work, but you own and control the code.

## External dependencies (not forked)

These come from third-party CDNs and stay there:

- **Phosphor Icons** — `https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css`
- **Swiper CSS** — `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css`
- **Swiper JS** — `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js`

## License & attribution

This system is derived from MAST by No-Code Supply Co. Check MAST's repo for
licensing terms.
