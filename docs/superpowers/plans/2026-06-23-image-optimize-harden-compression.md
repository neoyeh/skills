# image-optimize: Harden Compression Against Silent Failures

> **Status:** ✅ Completed & merged — PR #1, commit `9627223` on `main`, 2026-06-23.
> Written after the fact as a record (the work was done test-first via the
> `systematic-debugging` skill, not from a pre-written plan).

**Goal:** Stop the `image-optimize` compression path from failing silently — every
failure mode that could leave a missing, wrong, or broken image on the live site
must surface, and each fix must be guarded by a regression test.

**Driver:** vive-promo image compression runs this CLI; a silent miss = a broken
image shipped to the CMS.

**Tech Stack:** TypeScript, sharp/libvips, svgo, vitest, tsup. Repo: `neoyeh/skills`.

---

## Problem (each reproduced with evidence before fixing)

- **A — silent partial failure:** one bad image in a batch → missing output but CLI
  exited `0`. Casual/scripted use never noticed.
- **B — output-path collision:** two sources mapping to one output silently
  overwrote; report even said `processed=2, errors=0` while a file vanished.
- **C — EXIF orientation:** EXIF stripped without baking rotation → phone photos
  came out sideways (output stayed 200×100 for an orientation=6 image).
- **D — silent transparency flatten:** almost-opaque PNG → JPG flattened onto white
  with `warnings[]` left empty — no signal at all.
- **(bonus) svgo override typing:** pre-existing `tsc` error in `svg.ts`.

## File Map

- `src/commands/optimize.ts` — exit non-zero on ANY error (1 partial / 2 total).
- `src/runner.ts` — reserve output paths in a `Map`; collision → explicit error.
- `src/detect/load.ts` — auto-orient (`.rotate()`) when `orientation>1` & not animated,
  baking rotation into pixels before EXIF is stripped.
- `src/pipelines/jpeg.ts` — push a `flatten` warning when alpha is flattened.
- `src/pipelines/svg.ts` — map svgo overrides `true→undefined`, `false→false`
  (runtime-identical, clears the typecheck error).
- `test/{exit-code,collision,orientation,flatten-warning,svg}.test.ts` — new.

## Tasks (all done, test-first, one at a time)

- [x] A — exit-code fix + `test/exit-code.test.ts`
- [x] B — collision detection + `test/collision.test.ts`
- [x] C — EXIF auto-orient + `test/orientation.test.ts`
- [x] D — flatten warning + `test/flatten-warning.test.ts`
- [x] svg typecheck fix + `test/svg.test.ts`

## Verification (evidence)

- `npx vitest run` → **10 passed (5 files)**.
- Red→green proof: reverting all fixes → **exactly 4 fail / 5 pass**; restored → 10 pass.
- `npm run build` → exit 0. `npm run typecheck` → exit 0, 0 errors.

## ⚠️ Behaviour change

Exit code semantics changed: **partial failures now exit non-zero** (was `0`).
Anything consuming the CLI that tolerated partial failures will now see non-zero.

## Remaining / NOT done — robust timeout & hang protection

`main` still has **no timeout**, so a pathological image can wedge the batch.
A naive `Promise.race` timeout is **insufficient** (reproduced): it does not cancel
libvips native work, so the timed-out file lands late or leaves a torn file.

Correct fix needs BOTH:
1. **Cooperative cancellation** — an `AbortSignal` checked right before the write.
2. **Atomic write** — write a temp file, then `rename` (so a kill mid-write never
   leaves a corrupt file at the final path).

Resume test-first, one change at a time. Do not ship a `Promise.race`-only timeout.
