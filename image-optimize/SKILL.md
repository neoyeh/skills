---
name: image-optimize
description: Compress and convert images intelligently. Auto-routes formats based on content (photo vs graphic, transparent vs opaque), preserves transparency safely, handles HEIC from iPhone photos and animated GIFs. Call when the user wants to compress images, convert image formats (JPG/PNG/WebP/AVIF/HEIC/GIF/SVG), reduce image file sizes, optimize web assets, or process iPhone photos for the web.
type: tool
version: 0.1.0
---

# image-optimize

Smart image compression and format conversion. Designed to be called by AI agents.

## When to use this skill

Trigger when the user asks for any of these:

- Compress an image / make image smaller / reduce file size
- Convert image format (JPG → WebP, PNG → AVIF, HEIC → JPG, etc.)
- Optimize images for web / website / blog
- Process iPhone photos (HEIC) for the web
- Batch optimize a folder of images
- Strip EXIF metadata from photos
- Convert animated GIF to a smaller modern format
- Resize + compress assets

Do NOT trigger for:
- Image editing (crop / rotate / filters / color correction) — out of scope
- Image generation — wrong skill
- Video compression — not in v1 scope

## Core invocation

The skill exposes a single CLI command, `optimize`. Use it as:

```bash
optimize <input> [options]
```

Inputs can be a file or a directory (recursive). Common flags:

```
--profile <name>      web | blog | graphic | archive | preserve | modern  (default: web)
--quality <level>     light | balanced | aggressive | extreme  (default: balanced)
--output <dir>        Output directory (default: ./optimized/)
--flat                Flatten output (override mirrorStructure default)
--force               Reprocess every file, ignore up-to-date skip
--dry-run             Print plan, do not write
--json                Emit machine-readable JSON to stdout
--config <path>       Override config discovery
--no-config           Ignore all config files, use built-in defaults
```

### Examples for common asks

| User asks | Command |
|---|---|
| "compress this image" | `optimize photo.jpg --json` |
| "convert all PNGs in `assets/` to WebP" | `optimize assets/ --profile modern --json` |
| "process my iPhone photos" | `optimize ~/iphone-photos/ --profile blog --json` |
| "preview what would happen" | `optimize assets/ --dry-run --json` |
| "shrink this for an email signature" | `optimize avatar.png --quality aggressive --json` |

## Output contract (with `--json`)

Every invocation with `--json` emits one JSON object on stdout. Exit code 0 means processing finished (even if some files were skipped), non-zero means a fatal error before processing started.

```json
{
  "schema": "image-optimize/v1",
  "configSource": "/abs/path/to/imgopt.config.js" ,
  "profile": "web",
  "qualityLevel": "balanced",
  "processed": [
    {
      "input": "src/hero.png",
      "output": "optimized/hero.jpg",
      "inputBytes": 3850000,
      "outputBytes": 421000,
      "savedBytes": 3429000,
      "savedRatio": 0.891,
      "inputFormat": "png",
      "outputFormat": "jpg",
      "transformedBy": ["transparency-route:opaque->jpg", "mozjpeg"],
      "warnings": []
    }
  ],
  "skipped": [
    {
      "input": "src/icon.svg",
      "reason": "already-smaller-than-threshold"
    }
  ],
  "errors": [
    {
      "input": "src/broken.heic",
      "message": "HEIC decode failed (sharp + heic-convert both errored)"
    }
  ],
  "summary": {
    "totalFiles": 47,
    "processedCount": 45,
    "skippedCount": 1,
    "errorCount": 1,
    "totalInputBytes": 178000000,
    "totalOutputBytes": 19400000,
    "totalSavedBytes": 158600000,
    "totalSavedRatio": 0.891
  }
}
```

When invoked **without** `--json`, output is human-readable with colors and progress.

## Smart routing built in

The skill makes safe defaults so the caller does not have to specify every option:

- **PNG transparency-aware routing** — opaque PNG → JPG (huge savings); transparent PNG → kept as PNG or converted to WebP (preserves alpha). Never silently destroys transparency.
- **Photo vs graphic detection** — content analysis decides whether AVIF (photographic) or quantized PNG (logos/UI) is the better target.
- **HEIC dual-engine** — Sharp first (fast native), `heic-convert` fallback (cross-platform reliable).
- **Animated GIF** — detected by frame count; routed to animated WebP for best size, or kept as GIF when profile demands compatibility.
- **Idempotent skip (rsync-style)** — re-running on the same input is a near-no-op. Files whose output is at least as new as the input are skipped without re-encoding. Use `--force` to override.
- **Threshold skip** — if a same-format re-encode would save less than `skipIfSmallerThan` (default 5%), the original is copied through as-is (avoids generation loss for lossy formats).
- **Subdirectory mirror** — output preserves input subdirectory layout by default (`mirrorStructure: true`). Use `--flat` to dump everything into the output root.

Callers do not need to reason about these decisions. Just pass the input.

## Init: scaffolding per-project config

When the user wants to give a project its own optimization rules:

```bash
optimize init                  # interactive wizard
optimize init --preset web     # one-shot from preset
optimize init -y               # accept all defaults silently
```

Available presets: `web` (default), `blog`, `graphic`, `archive`, `preserve`, `modern`.

The wizard creates `imgopt.config.js` in the current directory. Subsequent `optimize` calls auto-discover and apply it.

## Config discovery (auto)

The skill walks up from CWD looking for, in order:

1. `--config <path>` flag
2. `imgopt.config.js` / `.mjs` / `.ts`
3. `imgopt.config.json` / `.imgoptrc.json`
4. `package.json` field `"imgopt"`
5. `~/.config/imgopt/config.json` (user global)
6. Built-in defaults

When in doubt, the JSON output's `configSource` field tells you which one was used.

## Profiles cheat sheet

| Profile | JPG | PNG (opaque) | PNG (transparent) | Animated GIF | Notes |
|---|---|---|---|---|---|
| `web` (default, smart) | JPG compressed | **→ JPG** | preserved as PNG | → animated WebP | Most common — transparency-safe smart routing |
| `preserve` | JPG compressed | PNG quantized | PNG quantized | optimized GIF | Strict no-format-conversion |
| `modern` | → AVIF | → AVIF | → WebP (alpha) | → animated WebP | Maximum compression, requires `<picture>` fallback |
| `blog` | high-quality JPG | → JPG | preserved | → animated WebP | Photo-first |
| `graphic` | JPG compressed | quantized PNG | quantized PNG | → animated WebP | UI/icons, sharp-edge friendly |
| `archive` | quality 95 JPG | lossless PNG | lossless PNG | optimized GIF | Visually lossless, larger files |

## Quality levels (abstract, format-aware)

The caller picks an abstract level; the skill maps it to format-specific quality numbers internally (JPEG 80 ≈ AVIF 60, etc.):

| Level | Approx file reduction | Visual loss |
|---|---|---|
| `light` | 20–40% | Negligible |
| `balanced` (default) | 50–70% | Visually lossless |
| `aggressive` | 70–85% | Visible on close inspection |
| `extreme` | 85%+ | Visibly lossy |

## Supported formats

**Read**: JPEG, PNG, WebP, AVIF, GIF (incl. animated), SVG, TIFF, HEIC/HEIF, BMP

**Write**: JPEG (mozjpeg), PNG (incl. quantized), WebP (incl. animated), AVIF, SVG (passthrough + SVGO), GIF (via gifsicle, when `preserve` profile)

**Out of scope (v1)**: video, RAW (DNG/CR2/NEF/ARW), JPEG XL, APNG.

## Reference docs (load on demand)

For complex situations, see:

- [references/format-decision.md](references/format-decision.md) — Full decision tree for which output format to pick
- [references/codec-guide.md](references/codec-guide.md) — Quality-number mapping and codec internals
- [references/troubleshooting.md](references/troubleshooting.md) — Common errors and fixes (HEIC failure, missing dependencies, etc.)

## Failure modes the caller should handle

- **`heic-convert` slow on large HEIC** — cold start can be 1–3s per image; budget accordingly when batching.
- **HEIF unsupported on this platform** — if both Sharp and `heic-convert` fail, the file appears in `errors[]`. Fall back to telling the user to install ImageMagick locally.
- **Output directory not writable** — fatal, exits non-zero before processing.
- **Input file unreadable / not an image** — appears in `errors[]`, processing continues for other files.
