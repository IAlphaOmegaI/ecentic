# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md is the single source of truth for project instructions — product context, commands, architecture, patterns, standards, tech stack, environment variables, and learned preferences all live there. Read it (and the `docs/` it points to) before substantial work. This file adds only the Claude-specific layer on top; nothing here overrides AGENTS.md.

## Keeping the Split Clean

- Project knowledge, conventions, and learned preferences belong in `AGENTS.md` (or `docs/`), so every tool and agent benefits — never record them here.
- Add to this file only what is specific to Claude Code sessions: habits, shortcuts, and tool integrations.

## Consulting Codex

Get second opinions from Codex — always the `gpt-6-astra` model, always in
a read-only sandbox: Codex is a consultant here, not an implementer, and must
not edit files. Reasoning effort is **`xhigh` by default**; `max` is reserved
for the cases in § Reasoning effort below.

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
  consultation costs real time (budget 5–15 minutes at `xhigh`, 10–30 at
  `max`, potentially longer) and real tokens, so it is an exception, not a
  habit.

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

**Reasoning effort** — `xhigh` is the default for every consultation, including
both standing checkpoints. Above `xhigh`, each level buys a large latency and
token cost for a gain that on ordinary questions is usually nil — in practice
`max` returns the same answer as `xhigh`, only much later. Use `max` only when:

- the user asks for it (the prompt says "at max", "max effort" or similar) —
  then it is mandatory for that consultation, not a suggestion; or
- the question is **architectural blueprinting**: a design that has to hold
  across many modules at once (a data model shared by several features, a
  migration strategy for a live schema, a security or authorization model,
  the boundary with a third-party platform such as Shopify), or a correctness
  argument that has to survive many cases (an authorization rule, a state
  machine, a billing or quota invariant). That is a plan checkpoint for a
  large piece of work, not a review checkpoint: the post-implementation
  review reads code, and `xhigh` is the level for that.

Never `max` for a single-file decision, a code question, a bug, or a review
pass. Name the level in the one-line status ("consulting Codex at max on X")
so the longer silence is explained. Levels above `max` (`ultra`) are never used
here.

The session default is the variable `CODEX_REASONING_EFFORT`, falling back to
`xhigh`: `.mcp.json` expands it into the server's `-c` pin, the
`codex-consultant` fallback reads it into its `codex exec` line, and for MCP
calls it is the level to put in `config` unless § Reasoning effort selects
`max` for that consultation. Check it once per session
(`echo "${CODEX_REASONING_EFFORT:-xhigh}"`) rather than assuming `xhigh`. So
`CODEX_REASONING_EFFORT=max claude` runs a whole session at max without editing
any file; the per-call rule still decides a single consultation.

**Primary transport — the codex MCP server** (registered in `.mcp.json`):

- Call the `mcp__codex__codex` tool with the complete focused question as
  `prompt`, including relevant file paths — and **always pass, on every call:**
  `sandbox: "read-only"`, `model: "gpt-6-astra"`, and
  `config: { "model_reasoning_effort": "<level>" }` — the session default
  above, or `"max"` when § Reasoning effort says so. The per-call arguments
  are the only settings that bind:
  verified against the codex 0.146.0 source, a tool call builds its
  configuration from `~/.codex/config.toml` plus the call's own arguments, and
  the `-c` pins the server is launched with in `.mcp.json` never reach it
  (they stay there as the documented intent). A call without `sandbox` lets
  Codex write to the working tree; a call without `config` runs at whatever
  effort the user's global config names — `ultra` at the time of writing —
  which is the most expensive level, not the default.
- For a follow-up in the same consultation, call `mcp__codex__codex-reply`
  with the returned `threadId` — the thread keeps the model, effort and sandbox
  of the opening call.
- Independent questions fan out as parallel `mcp__codex__codex` calls in a
  single message.
- The call blocks for the consultation's duration. [OpenAI documents](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)
  higher reasoning effort as trading latency and token usage for quality, but
  does not publish a fixed runtime; budget 5–15 minutes at `xhigh` and 10–30
  at `max`, with complex or tool-heavy calls potentially taking longer. The
  codex entry in `.mcp.json`
  sets a per-server hard `timeout` of 60 minutes as a runaway-spend cap — a
  consultation still running past that is broken, not thorough. Say the one-line
  status before calling so the silence is explained.

**Fallback — only when the MCP tool is absent from the session:** use the
`codex-consultant` subagent (`.claude/agents/codex-consultant.md`), which
drives the CLI directly with the same pins — it runs at `xhigh` unless the
brief carries an `effort: max` line, and never escalates on its own. For a
quick one-off, the direct CLI also works (swap `xhigh` for `max` under the
same rule):

```bash
codex exec -m gpt-6-astra -c model_reasoning_effort="xhigh" --sandbox read-only "<focused question, including relevant file paths>"
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
