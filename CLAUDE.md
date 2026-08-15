# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md is the single source of truth for project instructions — product context, commands, architecture, patterns, standards, tech stack, environment variables, and learned preferences all live there. Read it (and the `docs/` it points to) before substantial work. This file adds only the Claude-specific layer on top; nothing here overrides AGENTS.md.

## Keeping the Split Clean

- Project knowledge, conventions, and learned preferences belong in `AGENTS.md` (or `docs/`), so every tool and agent benefits — never record them here.
- Add to this file only what is specific to Claude Code sessions: habits, shortcuts, and tool integrations.
