# Codec guide

How the abstract `quality` levels map to format-specific quality numbers, and why the numbers differ across formats.

## The quality-number trap

A quality of `80` is **not** comparable across formats:

| JPEG | WebP (lossy) | AVIF |
|---|---|---|
| 95 (excellent) | ~88 | ~75 |
| 85 (high) | ~80 | ~63 |
| 80 (recommended) | ~75 | ~55 |
| 75 (medium) | ~70 | ~48 |
| 60 (low) | ~55 | ~35 |

So `--quality 80` would be vastly different output if it set every format to 80 literally. The skill abstracts over this with named levels.

## How abstract levels map

| Level | JPEG | PNG (quantize) | WebP | AVIF |
|---|---|---|---|---|
| `light` | 92 | 90 | 90 | 75 |
| `balanced` (default) | 82 | 80 | 80 | 60 |
| `aggressive` | 72 | 70 | 70 | 48 |
| `extreme` | 60 | 60 | 60 | 35 |

These numbers are calibrated so each row is roughly visually equivalent (target SSIM ≥ 0.96 for `balanced`).

## Per-format internals

### JPEG (mozjpeg)

- Encoder: **mozjpeg** via libvips (Sharp's `mozjpeg: true`)
- Compared to libjpeg, mozjpeg saves ~5–15% at the same quality.
- `progressive: true` enables progressive rendering — slightly smaller files and a better perceived loading experience.
- `chromaSubsampling: '4:2:0'` is the default — halves chroma resolution. Imperceptible on photos, can blur fine red text.
  - Force `'4:4:4'` for screenshots / UI / text-heavy images.

### PNG

PNG is lossless by default. The skill applies two strategies:

1. **Quantization** (lossy): `palette: true` reduces 24-bit RGB to an indexed palette. libvips uses **libimagequant** internally — same engine as `pngquant`.
2. **Compression** (lossless): `compressionLevel: 9` + `effort: 7` for maximum size reduction.

Set `quantize: false` in config to force lossless-only.

### WebP

- Lossy mode: VP8 encoder, generally ~25–35% smaller than JPEG at equivalent visual quality.
- Lossless mode: separate VP8L codec, useful for screenshots / graphics.
- `effort: 4` is balanced (Sharp's default). Bumping to 6 saves ~5% at the cost of much slower encoding.
- `alphaQuality: 100` keeps transparency edges crisp; lower it (e.g. 75) for further savings on alpha-heavy graphics.
- **Animated WebP** is the default target for animated GIF input — typically 30-50% smaller than the source GIF, with truecolor instead of 256-color palette.

### AVIF

- Codec: **AOM AV1** via libheif/libvips
- Best compression of any web format: ~50% smaller than JPEG at equivalent SSIM.
- Encoding is **slow** — 10-50× slower than JPEG. Acceptable for batch optimization, painful for real-time.
- `effort: 4` is the practical sweet spot. Higher values (8-9) save ~5% at 2-4× the encoding time.
- `chromaSubsampling: '4:4:4'` is the AVIF default (unlike JPEG) because the codec handles colour better with full chroma resolution.

### GIF

- Output codec: **gifsicle** binary (bundled via the `gifsicle` npm package).
- Optimization levels: `-O1` (basic) to `-O3` (best, slower).
- The skill defaults to `-O3` — gifsicle is fast enough that the extra time is negligible.
- Reducing `colors` below 256 trades quality for size; 128 is often imperceptible, 64 starts to show banding.

### SVG

- Optimizer: **SVGO** with `preset-default`.
- Strips comments, unused metadata, redundant precision; merges paths.
- Typical reduction: 20–60%.
- Be careful with `removeViewBox: true` — it breaks responsive scaling. Off by default.

## Why visually-lossless = SSIM 0.96+

The skill targets **SSIM ≥ 0.96** at the `balanced` level, based on the empirical mapping that 0.96+ corresponds to "differences require A/B comparison to spot" for typical web content.

Other perceptual metrics:

- **PSNR ≥ 40 dB** — loosely correlates but doesn't match human perception (especially on chroma)
- **Butteraugli ≤ 1.5** — Google's perceptual metric, more accurate than SSIM but slower to compute
- **SSIMULACRA2 ≥ 80** — current state of the art, used internally by Cloudinary/JPEG XL group

The `archive` profile targets SSIMULACRA2 ≥ 95 (genuinely visually lossless on close inspection).

## When to deviate from balanced

| Scenario | Recommended level |
|---|---|
| Hero images / above-the-fold | `balanced` |
| Thumbnails (≤200px) | `aggressive` |
| Email signature / avatar | `aggressive` |
| Blog body images | `balanced` |
| Photography portfolio | `light` or `archive` profile |
| Print export | `archive` profile (or `light`) |
