# skills

A collection of skills designed for AI agents (Claude Code, Claude Agent SDK, custom agents).

Each skill is a self-contained Node.js package — install its dependencies and the skill is ready to use, both via CLI and as a programmatic API.

## Skills in this collection

| Skill | Description |
|---|---|
| [image-optimize](./image-optimize/) | Smart image compression and format conversion. Auto-routes formats based on content (photo vs graphic, transparent vs opaque), preserves transparency safely, handles HEIC and animated GIFs. |

## Using a skill

Each skill is independent. To use one:

```bash
cd <skill-name>
npm install              # auto-builds via the `prepare` script
npm link                 # optional: register the CLI globally
```

Read the skill's `SKILL.md` for the AI-facing contract (when to invoke, output schema) and `README.md` for human usage.

## Adding a new skill

Each skill should:

1. Be in its own subdirectory at the root of this repo.
2. Have a `SKILL.md` describing when AI agents should invoke it and the expected I/O contract.
3. Have a `package.json` with its own dependencies and a `prepare` script that builds on install.
4. Emit machine-readable JSON via `--json` (or equivalent) so AI agents can parse results.
5. Avoid interactive prompts in the AI-facing code path; reserve them for human-only commands like `init`.

## License

MIT (per skill — check each subdirectory).
