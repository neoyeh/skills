# Troubleshooting

## HEIC files fail to decode

Symptom: an `errors[]` entry like `HEIC decode failed (sharp + heic-convert both errored)`.

Causes (in order of likelihood):

1. **The file isn't actually HEIC** — `.heic` extension on a non-HEIF container. Check with `file path/to/image.heic`.
2. **Corrupt or partial transfer** — re-export from the source.
3. **`heic-convert` cannot handle this HEVC profile** — happens with some pro-capture HEIC variants. Workaround: convert externally with `magick input.heic output.jpg` then re-run the skill.

The skill prints which engine failed via `decoded-via:` in `transformedBy[]` — useful for diagnosis.

## "Cannot output GIF: package 'gifsicle' not installed"

You picked the `preserve` profile (or `gifRoute.animated: 'preserve'`) on an animated GIF, but `gifsicle` is missing.

Fix: `npm install gifsicle` (or pick a non-`preserve` profile to route animated GIFs through animated WebP, which Sharp can output without external binaries).

## Sharp fails to install / load

On macOS or Linux this should rarely happen with Sharp 0.33+ — it ships prebuilt binaries for x64 and arm64.

If you see installation errors:

```bash
npm rebuild sharp
# or
npm install --include=optional sharp
```

For Linux musl (Alpine) you may need:

```bash
npm install --cpu=x64 --os=linux --libc=musl sharp
```

## Output files are bigger than the input

- The skill writes `skipped[]` entries for files where compression saved less than `skipIfSmallerThan` (default `5%`). If you see this, the input was already well-compressed — no action needed.
- For inputs that *do* get bigger after re-encoding, double-check you didn't pick `light` quality on an already-optimized JPG. `aggressive` or `balanced` is usually right for normal sources.

## "Already optimized" idempotency

The skill detects when re-running on its own output would produce no meaningful win. If you genuinely want to force a re-run (e.g. you changed quality level), delete the output file first or use a different `--output` directory.

## EXIF stripping breaks orientation

Some cameras / phones store the photo rotated and rely on the EXIF Orientation tag to display correctly. Stripping EXIF can leave the image displayed rotated.

The skill applies EXIF orientation **before** stripping, so the rotation is baked into the pixels. If you still see issues, check that your image viewer respects the encoded pixel orientation rather than re-applying EXIF.

## Animated GIFs lose colour fidelity in WebP

Animated GIF is 256-colour palette. Animated WebP is truecolor — the conversion should *improve* fidelity, not degrade it. If you see banding, check:

- The profile's `quality` level (try `light` if `balanced` looks degraded)
- `webp.lossless: true` for absolute fidelity (file will be larger)

## Non-Latin filenames get mangled

Default `slug` is `false` → filenames are preserved as-is. If you turned it on, the cleanup rules strip non-ASCII by default. To preserve, e.g., Chinese filenames:

```js
{
  output: {
    slug: false,  // or:
    transformName: (name) => name.toLowerCase().replace(/\\s+/g, '-'),
  },
}
```

## "Config not found" but I have one

The skill walks **up** from CWD looking for config. If you run `optimize` from `~/projects/myapp/src/assets`, it will find `~/projects/myapp/imgopt.config.js`. But if you symlinked `myapp` from elsewhere, the search root may not be where you think.

Use `--config <path>` to be explicit, or check the JSON output's `configSource` field.

## Performance: batch processing is slow

- Default concurrency is `4`. Bump it via `concurrency: 8` (or higher) in config — but watch memory, as Sharp keeps decoded images in RAM.
- AVIF encoding is the slowest pipeline. If you're encoding hundreds of files, consider `webp` instead (5-10× faster, only marginally larger).
- HEIC fallback (`heic-convert`) is much slower than Sharp's native HEIF decoder. If most input is HEIC, ensure your platform has libvips with HEIF support installed.

## Empty output / no files processed

Check:

1. Is the input path correct? (relative vs absolute)
2. Are the file extensions in the supported set? (`.jpg .jpeg .png .webp .avif .gif .svg .tif .tiff .heic .heif .bmp`)
3. Is a `rules:` block accidentally filtering everything out?

`optimize <input> --dry-run --json` shows what would be processed without writing anything.
