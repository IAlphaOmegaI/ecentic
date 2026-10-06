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
`xhigh`: the consult script reads it, and it is the level every run is pinned
to unless § Reasoning effort selects `max` for that consultation. Check it
once per session (`echo "${CODEX_REASONING_EFFORT:-xhigh}"`) rather than
assuming `xhigh`. So `CODEX_REASONING_EFFORT=max claude` runs a whole session
at max without editing any file; the per-call rule still decides a single
consultation.

**Transport — the `codex-consultant` subagent** (`.claude/agents/codex-consultant.md`),
a courier that runs one script, `.claude/scripts/codex-consult.sh`, and
nothing else. There is no codex MCP server:
`codex mcp-server` was deprecated upstream at codex-cli 0.149.1 and removed in
0.154.0 (9 Sep 2026) in favour of `codex app-server`, which speaks Codex's own
JSON-RPC protocol and is not an MCP server. It existed in 0.146.0 and 0.153.4,
the last version installed here before the auto-update to 0.155.1, whose
binary carries no `codex`/`codex-reply` tool surface at all — so `.mcp.json`
no longer registers one. `codex exec` is the supported lane, and the script is
the only thing that calls it:

- **The question travels as a file, and so does the answer.** Write the
  complete focused question, relevant file paths included, to a file in the
  scratchpad (a path without spaces), and dispatch the subagent with one line
  and nothing else — `brief: <absolute path>` — plus `effort: max` on a line
  of its own when § Reasoning effort calls for it; it runs at the session
  default otherwise and never escalates on its own. The script pipes that file
  to Codex byte for byte. A question typed into the prompt is not carried: it
  comes back `STATUS: rejected`. Independent questions fan out as parallel
  subagent instances in a single message, one brief file each.
- **The hand-back is five lines, none of them Codex's words**: `CODEX
  CONSULT`, `STATUS:` (`complete`, `partial`, `failed`, `timeout`, `rejected`
  or `unavailable`), `SESSION: <uuid>`, `ANSWER_FILE: <path>` and
  `REPORT_FILE: <path>`, with a `REASON:` line when the run did not complete.
  **Codex's answer is the contents of `ANSWER_FILE` — read that file
  yourself, once `verify` (below) has said `VERIFIED`.** `REPORT_FILE` records
  what Codex's own header said it ran with (model, effort, sandbox), the
  session file it wrote under `~/.codex/sessions/` — the proof a session ran —
  the SHA-256 of the brief Codex was sent, which is your file's
  (`shasum -a 256`) when an answer seems to be to another question, and the
  SHA-256 of the answer as the run ended. `verify` compares the file with that
  digest: `CHANGED` means something has written to it since, and it is not
  used — tell the user, as for a hand-back in another shape.
- **Codex's session file is opened in one case only: a run that ended with no
  answer** — a crash, a clean exit that wrote nothing, a process lost, the
  cap. If the file records a turn Codex finished since the run began, that
  turn's final message becomes `ANSWER_FILE`, the status is `partial` and the
  `REASON:` says so; with no finished turn the run stays `failed` or
  `timeout`. The working notes of an unfinished turn are transcript and are
  never lifted, and a run failed for its sandbox recovers nothing. The
  record's format is Codex's own: after an update that changes it, recovery
  finds nothing and the run fails as it did before.
- **A hand-back in any other shape is not Codex's.** Prose, findings, a
  review, an `ANSWER:` section, an `ANSWER_FILE` that does not exist: the
  subagent wrote it, whatever it is headed. Do not read it as an answer and do
  not send the subagent again — tell the user the lane failed, and run the
  script yourself (below). This rule is what the transport exists for. Of 51
  consultations between 22 Sep and 6 Oct 2026, under a subagent *instructed*
  to relay verbatim, two were answered by the subagent with Codex never
  launched, 33 began with the subagent reading the repository itself, about
  ten rewrote the question on its way in, and every answer was retyped by the
  model on its way back. So nothing is left to instruction: the subagent has
  no file tools, a hook refuses every command but the script and every report
  but the script's own text, and neither the question nor the answer passes
  through it. An agent definition is read when a session starts, so a session
  opened before the file last changed still runs the one it loaded.
- **The pins are the script's, on every run**: `--sandbox read-only` (Codex is
  a consultant, not an implementer — without it Codex can write to the working
  tree; a run whose header does not report it is stopped and failed),
  `-m gpt-6-astra`, and `-c model_reasoning_effort=<level>`. A hand-typed
  `codex exec` without the effort pin inherits whatever the user's global
  `~/.codex/config.toml` names — `max` at the time of writing, the most
  expensive level, not the default — so never hand-type one.
- A run takes minutes, not seconds. [OpenAI documents](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)
  higher reasoning effort as trading latency and token usage for quality, but
  does not publish a fixed runtime; budget 5–15 minutes at `xhigh` and 10–30
  at `max`, with complex or tool-heavy runs potentially taking longer. The
  script launches Codex detached and keeps the clock, so no tool-call timeout
  kills the run; it stops the run at 55 minutes (`STATUS: timeout` — resume
  the session and ask for what it has). A second `start` for a brief that is
  running, or was answered in the last two hours, returns that run rather than
  paying for another. Say the one-line status before dispatching so the
  silence is explained.
- For a follow-up in the same consultation, the hand-back carries the run's
  `SESSION: <uuid>`; a rebuttal is a new brief file and a new subagent
  instance, dispatched with `brief: <path>` and `resume: <uuid>`, and it runs
  `codex exec resume <uuid>` under the same pins. Never `--last`: with
  parallel consultations the newest session may be another question's. This
  replaces the retired MCP `threadId`.

The same script is the direct lane — when a hand-back is not valid, or for a
consultation the session runs itself:

```bash
.claude/scripts/codex-consult.sh start <brief file> [--effort max] [--resume <uuid>]   # the hand-back, or NEXT: the wait command
.claude/scripts/codex-consult.sh wait <run directory> --until-done                      # in a background Bash call; prints the hand-back
.claude/scripts/codex-consult.sh verify <ANSWER_FILE>                                   # before reading an answer: VERIFIED, or CHANGED — not used
.claude/scripts/codex-consult.sh list                                                   # recent runs — wait on one a subagent left running, never start it again
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
outcome. After verifying Codex's answer, send a rebuttal through the subagent
with a `resume: <SESSION uuid>` line only when one of these holds:

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
  stays in the run's `ANSWER_FILE` if the user asks for it.
