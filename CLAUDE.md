# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md is the single source of truth for project instructions — product context, commands, architecture, patterns, standards, tech stack, environment variables, and learned preferences all live there. Read it (and the `docs/` it points to) before substantial work. This file adds only the Claude-specific layer on top; nothing here overrides AGENTS.md.

## Keeping the Split Clean

- Project knowledge, conventions, and learned preferences belong in `AGENTS.md` (or `docs/`), so every tool and agent benefits — never record them here.
- Add to this file only what is specific to Claude Code sessions: habits, shortcuts, and tool integrations.

## Consulting Codex

Get second opinions from Codex — always the `gpt-5.6-sol` model at `xhigh`
(extra high) reasoning effort, always in a read-only sandbox: Codex is a
consultant here, not an implementer, and must not edit files.

A consultation starts one of two ways, with identical mechanics:

- **User-requested** — the prompt says/means "consult with codex" (or
  similar). Consulting is then mandatory: never silently skip it.
- **Self-initiated** — no trigger phrase needed, but **not routine: the
  default for ordinary work is no consultation.** Most tasks never warrant
  one — routine implementation, anything you can settle yourself by reading
  the code, docs, or tests, small refactors, questions with a clear
  conventional answer. Self-initiate only when a decision is both **genuinely
  uncertain** (you cannot resolve it with the sources at hand) and
  **consequential** (being wrong is expensive — security-sensitive paths,
  hard-to-reverse architecture, data integrity, filings) — or when you are
  truly stuck after your own attempts. When those conditions hold, consult at
  any point in the process, more than once in a hard task if needed — but each
  consultation costs real time (5–15 minutes) and real tokens, so it is an
  exception, not a habit.

- **Standing checkpoints** — for work that meets the bar (multi-file features,
  schema or migration changes, security-sensitive code, new architectural
  patterns, anything expensive to reverse — not small fixes, UI tweaks,
  refactors, or docs), two consultations are the **default**, not a judgment
  call; skip a due checkpoint only for a stated reason,  never silently.

1. **Before committing to a plan** — send the plan, its constraints, and the
   alternatives you rejected; ask for flaws, risks, and better approaches
   while changing course is still cheap. A flawed plan caught in ten minutes
   saves the hours built on top of it.
2. **After implementing, before reporting done** — send the intent and the
   changed-file list (Codex reads the working tree, so uncommitted changes are
   visible); ask for evidence-backed findings — hidden implications, gaps,
   possible improvements — explicitly inviting low-confidence findings, since
   coverage beats self-filtering at review time. This checkpoint exists
   because post-implementation failures are blind spots: the uncertainty gate
   above can never fire on them, and confidence is precisely when review
   matters most. **One review pass per deliverable** — verify and apply the
   resulting fixes yourself rather than re-submitting them to Codex, unless a
   fix is itself large enough to meet the bar.

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
  `xhigh`. Long calls are safe by default (the MCP tool timeout defaults to
  ~28 hours); the codex entry in `.mcp.json` sets a per-server `timeout` of
  30 minutes purely as a runaway-spend cap — a consultation still running past
  that is broken, not thorough. Say the one-line status before calling so the
  silence is explained.

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

Single round by default; escalate only when another round can change the
outcome. After verifying Codex's answer, send a rebuttal via
`mcp__codex__codex-reply` (same `threadId`) only when one of these holds:

1. **Your verification contradicts a material claim** — send the evidence
   (file:line, build output, installed-package source) and ask Codex to defend
   or revise. Either outcome is a win: it concedes, or it surfaces what your
   verification missed.
2. **The disagreement is a judgment call the code cannot settle** (design
   trade-off, migration strategy) — exchange reasoning once.
3. **The answer missed or misread the question** — clarify it.

Escalation rules: maximum **two** rebuttal rounds — a disagreement that
survives them is a finding to report, not a debate to win. Positions change on
**evidence only, never on assertion**: do not adopt a Codex claim because it is
stated confidently, and treat a Codex concession that comes without new
evidence as unresolved rather than as agreement. Escalation needs no user
permission and stays invisible in the final answer unless the disagreement
survives (per the reporting rules below).

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