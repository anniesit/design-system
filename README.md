# Design System

Centralized CSS and JS for Webflow projects, served via [jsDelivr](https://www.jsdelivr.com/).

## File Structure

```
design-system/
├── css/
│   ├── global.css              ← resets, variables, typography, spacing
│   └── components/
│       ├── dialog.css
│       ├── table.css
│       └── checkbox.css
├── js/
│   ├── global.js               ← shared utilities
│   ├── utils/
│   │   ├── countup.js
│   │   └── component-loader.js ← loads shared components (navbar, footer)
│   └── components/
│       ├── btn-totop.js
│       ├── accordion.js
│       └── modal.js
└── README.md
```

## Usage

### Base URL

```
https://cdn.jsdelivr.net/gh/anniesit/design-system/{file-path}
```

### Linking in Webflow

**Project-wide** — add in Project Settings → Custom Code:

```html
<!-- Head section -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/anniesit/design-system/css/global.css">

<!-- Footer section -->
<script src="https://cdn.jsdelivr.net/gh/anniesit/design-system/js/global.js"></script>
<script src="https://cdn.jsdelivr.net/gh/anniesit/design-system/js/utils/component-loader.js"></script>
```

**Page-specific** — add on individual pages for components only that page needs:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/anniesit/design-system/css/components/accordion.css">
<script src="https://cdn.jsdelivr.net/gh/anniesit/design-system/js/components/accordion.js"></script>
```

## Handling jsDelivr Cache

jsDelivr caches files aggressively. After pushing updates to GitHub, the CDN may still serve the old version. Two ways to handle this:

### 1. Purge the cache (during development)

After pushing changes, swap `cdn` for `purge` in the URL and visit it in your browser:

```
https://purge.jsdelivr.net/gh/anniesit/design-system/css/global.css
```

This forces jsDelivr to fetch the latest version from GitHub.

### 2. Pin to a specific commit (for production)

Once your design system is stable and serving live projects, lock to an exact commit hash so updates don't accidentally break things:

```
https://cdn.jsdelivr.net/gh/anniesit/design-system@COMMIT_HASH/css/global.css
```

Replace `COMMIT_HASH` with the full or short hash from `git log`.

## Workflow

1. Edit CSS/JS locally
2. `git add .` →`git commit -m "message"` →`git push`
3. Purge jsDelivr cache if needed
4. Webflow picks up the changes
