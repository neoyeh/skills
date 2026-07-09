# image-optimize

Smart image optimization skill for AI agents.

Auto-routes formats based on content, preserves transparency safely, handles HEIC and animated GIFs. Designed to be invoked by Claude Code or other AI agents — but also usable directly as a CLI.

## Install

```bash
cd image-optimize
npm install
npm run build
npm link    # makes `optimize` available globally
```

`npm link` runs `postinstall` automatically, which:

1. Creates `~/.local/bin/optimize` — a shim with hardcoded absolute paths so the CLI works in non-login shells (e.g. Claude's Bash tool where nvm isn't loaded).
2. Symlinks `SKILL.md` into `~/.claude/skills/image-optimize.md` — registers the skill so Claude Code discovers it automatically.

If `~/.local/bin` is not in your PATH, add it:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

## Quickstart

```bash
# Optimize a single file
optimize photo.jpg

# Optimize a folder
optimize ./assets

# Get JSON output (for scripting / AI consumption)
optimize ./assets --json

# Preview without writing
optimize ./assets --dry-run

# Pick a profile
optimize ./assets --profile modern

# Bootstrap a per-project config
optimize init                 # interactive
optimize init --preset web    # one-shot
optimize init -y              # silent default
```

## Architecture

- **CLI entry** — `src/cli.ts` (commander)
- **Runner** — `src/runner.ts` (read → detect → route → pipeline → write → report)
- **Config** — `src/config/` (Zod schema, cosmiconfig discovery, layered merge)
- **Routing** — `src/routing/` (decide output format, map quality levels)
- **Detection** — `src/detect/` (file-type, transparency analysis, animated frame count)
- **Pipelines** — `src/pipelines/` (one file per output format)
- **Reporting** — `src/reporting/` (JSON for AI, pretty for humans)

## For AI agents

See [SKILL.md](SKILL.md) for the canonical skill contract — when to invoke, expected output schema, profile cheatsheet.

For deeper background:

- [references/format-decision.md](references/format-decision.md)
- [references/codec-guide.md](references/codec-guide.md)
- [references/troubleshooting.md](references/troubleshooting.md)

## License

MIT
