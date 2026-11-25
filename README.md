# blogspot-theme

A custom theme designed specifically for Blogspot.

## Template Features

- [ ] **Lightweight and dependency-free**: No need for external libraries.
- [ ] **SEO optimized**: Improved search engine rankings.
- [ ] **AdSense ready**: Optimized for displaying AdSense ads.
- [ ] **Fully responsive**: Adapts to any screen size.
- [ ] **Fast loading**: Minimal code for quick page loads.
- [ ] **Core Web Vitals compliant**: Compatible with [Core Web Vitals](https://pagespeed.web.dev/report?url=https://tempkaew.blogspot.com/).
- [ ] **Multi-level commenting**: Supports nested comments.
- [ ] **Styled widgets**: Custom-designed widgets for a cohesive look.
- [ ] **Best practices**: Built following industry best practices.

## Installation

To install this project, run the following command:

```bash
bun install
```

## Getting Started

**Development**: Start a local preview with sample posts. Saving a template, style, or script rebuilds the theme and reloads the browser. Sample titles and article HTML live in `preview/fixtures.js`.

```bash
bun run dev
```

Open http://127.0.0.1:4173. The bar at the bottom switches between the homepage, a post, a label, a page, and the 404 view.

**Production**: Build the XML theme to import into Blogger. The file is written to `dist/tempKaew.xml`.

```bash
bun run build
```

## Compiler

- [Hamlet Builder](https://github.com/zkreations/hamlet-builder)
