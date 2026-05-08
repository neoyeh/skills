# Format decision tree

This document explains the full logic the smart router uses to pick an output format. Most of the time you don't need to know this — the `web` profile makes good decisions automatically. Read this when:

- The skill made a surprising choice and you want to know why
- You want to write a custom `rules:` config
- You're picking between profiles for a specific use case

## The full decision tree

```
Input format?
│
├─ SVG ─────────────────→ output: SVG (passthrough + SVGO)
│
├─ HEIC/HEIF ───────────→ heicRoute.convert  (default: jpg)
│                          ├─ 'jpg'   → JPEG
│                          ├─ 'webp'  → WebP
│                          └─ 'avif'  → AVIF
│
├─ GIF ─────────────────→ Animated? (pages > 1)
│                          ├─ Yes → gifRoute.animated
│                          │         ├─ 'webp'     → animated WebP  (default)
│                          │         └─ 'preserve' → optimized GIF
│                          └─ No  → gifRoute.static
│                                    ├─ 'auto'     → has alpha? PNG : JPG
│                                    ├─ 'jpg'      → JPEG
│                                    ├─ 'png'      → PNG
│                                    └─ 'preserve' → optimized GIF
│
├─ PNG ─────────────────→ pngRoute.convert
│                          ├─ 'preserve' → PNG (always)
│                          ├─ 'webp'     → WebP (always)
│                          ├─ 'jpg'      → JPEG (forced; flattens transparency!)
│                          └─ 'auto' (default) ─→ Transparency state?
│                                                  ├─ opaque        → routing.opaque (default 'jpg')
│                                                  ├─ almost-opaque → routing.opaque (may flatten)
│                                                  └─ transparent   → routing.transparent (default 'preserve')
│
├─ JPG  ────────────────→ output: JPEG
├─ WebP ────────────────→ output: WebP
├─ AVIF ────────────────→ output: AVIF
│
└─ TIFF / BMP ──────────→ JPEG (or WebP/AVIF if pngRoute.routing.opaque is set)
```

## Profile presets cheat sheet

| Profile | What it changes |
|---|---|
| `web` (default) | Smart routing — opaque PNG→JPG, transparent→preserve, animated GIF→WebP |
| `preserve` | Forces every `convert: 'preserve'` — only compresses, never converts |
| `modern` | Forces every `convert: 'webp'/'avif'` — maximum compression |
| `blog` | Same routing as `web`, but JPG quality bumped to 88 |
| `graphic` | PNG always preserved, quantization on |
| `archive` | Lossless WebP, no PNG quantization, preserves EXIF |

## Transparency states explained

When the router sees a PNG with alpha channel, it doesn't blindly trust the channel exists. It analyzes the actual alpha values:

| State | Meaning | What router does |
|---|---|---|
| **opaque** | No alpha channel, OR all alpha = 255 | Route as if it were JPG-eligible |
| **almost-opaque** | <1% of pixels are transparent (configurable via `transparencyThreshold`) | Same as opaque, but flatten with bg colour if converting to JPG |
| **transparent** | ≥1% transparent pixels | Preserve transparency — never silently flatten |

This catches the "screenshot with rounded corners" case (1-pixel anti-aliased edges) without destroying real cutouts.

## Why some inputs always pass through

JPG, WebP, AVIF inputs are kept in the same format by every profile (except `modern`, which routes everything to AVIF/WebP). Reasons:

- **JPG → AVIF can be a downgrade**: re-encoding a low-quality JPG as AVIF doesn't recover the lost detail; it just adds a generation of loss.
- **WebP/AVIF → JPG is wasteful**: those formats are already smaller per-quality.
- **WebP → AVIF**: marginal savings (~10-15%) at the cost of slower encoding and broader compatibility loss.

If you really want format conversion in these cases, write a rule:

```js
{
  rules: [
    { match: '**/*.jpg', convert: 'webp' },
  ],
}
```

## When to override

Cases where you should **not** rely on the default `web` profile:

- **Static site generator with `<picture>` support** — use `modern` to get AVIF/WebP everywhere
- **Email templates** — use `preserve` (HTML email clients handle WebP/AVIF poorly)
- **Photography portfolio** — use `archive` or `blog` for max quality
- **CMS that doesn't update HTML references** — use `preserve` so existing `<img src="*.png">` keeps working
