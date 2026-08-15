# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md is the single source of truth for project instructions — product context, commands, architecture, patterns, standards, tech stack, environment variables, and learned preferences all live there. Read it (and the `docs/` it points to) before substantial work. This file adds only the Claude-specific layer on top; nothing here overrides AGENTS.md.

## Keeping the Split Clean

- Project knowledge, conventions, and learned preferences belong in `AGENTS.md` (or `docs/`), so every tool and agent benefits — never record them here.
- Add to this file only what is specific to Claude Code sessions: habits, shortcuts, and tool integrations.

## Consulting Codex

When a prompt says/means "consult with codex" (or similar), get a second opinion
from Codex — always the `gpt-5.6-sol` model at `xhigh` (extra high) reasoning
effort, always in a read-only sandbox: Codex is a consultant here, not an
implementer, and must not edit files.

Consult at any point in the process, not only before finalising an answer —
reach for it mid-task whenever you are unsure or not confident about something,
stuck and need help, or want a second opinion on an approach before committing
to it. Multiple consultations during one task are fine.

**Primary transport — the codex MCP server** (registered in `.mcp.json`, where
the model and effort are pinned):

- Call the `mcp__codex__codex` tool with the complete focused question as
  `prompt`, including relevant file paths — and **always pass
  `sandbox: "read-only"` in the arguments.** This per-call argument is the
  only effective sandbox control (verified: a server-side `sandbox_mode` pin
  is overridden by the tool's default) — a call without it lets Codex write to
  the working tree.
- For a follow-up in the same consultation, call `mcp__codex__codex-reply`
  with the returned `threadId` (plus `sandbox: "read-only"` again if accepted).
- Independent questions fan out as parallel `mcp__codex__codex` calls in a
  single message.
- The call blocks for the consultation's duration — typically 5–15 minutes at
  `xhigh`; `MCP_TOOL_TIMEOUT` is raised to 30 minutes in
  `.claude/settings.json` to accommodate this. Say the one-line status before
  calling so the silence is explained.

**Fallback — only when the MCP tool is absent from the session:** use the
`codex-consultant` subagent (`.claude/agents/codex-consultant.md`), which
drives the CLI directly with the same pins. For a quick one-off, the direct
CLI also works:

```bash
codex exec -m gpt-5.6-sol -c model_reasoning_effort="xhigh" --sandbox read-only "<focused question, including relevant file paths>"
```

- Ask a focused question with enough context rather than restating the whole task.
- If codex is unavailable on every lane, say so and continue with your own
  analysis clearly labeled as unconsulted — never silently skip a requested
  consultation, and never present your own opinion as Codex's.

Codex output is advisory, never authoritative:

- Verify every factual claim it makes (APIs, file contents, behavior) against
  the actual code and docs before relying on it.
- Reason through its recommendations independently; adopt them only when your
  own analysis agrees.
- If Codex conflicts with this repo's docs, the docs win (see `AGENTS.md`
  § How To Work In This Repo).

Report one answer, not the negotiation:

- Deliver a **single, final, synthesized answer** after the consultation
  completes. Never give a preliminary answer while Codex runs and a second
  answer after it returns. Form your own view before reading Codex's answer
  (it guards against anchoring), but keep it as internal working notes — the
  only thing worth saying while Codex runs is a one-line status ("consulting
  Codex on X, takes a few minutes").
- Do not relay Codex's response or narrate the exchange — what it said, what
  you checked, follow-ups you sent. The verification must happen; its
  transcript is not the deliverable.
- Mention Codex explicitly only when it materially changed your conclusion, or
  when a disagreement remains unresolved after verification — then state both
  positions in a sentence or two so the user can decide. Codex's full answer
  stays available in the consultant subagent's report if the user asks for it.
