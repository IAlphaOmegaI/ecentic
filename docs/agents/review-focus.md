# Review focus

What a review of a change looks for, beyond what the gates already decide.
Each entry is a mistake that has turned up here more than once and that no
test, type check or lint rule catches. It is written so a reviewer can tell
from the diff alone whether the entry applies.

Every post-implementation review brief names this file (`CLAUDE.md`
§ Consulting Codex, checkpoint 2). It is not a `REVIEW.md`: that file is read
only by the hosted Code Review on GitHub pull requests, and most work here
lands on `main` without one.

## How a reviewer uses it

1. Read the diff and take only the entries whose trigger matches. Most
   changes match a few, and many match none.
2. Run each matching entry's check against the code, not against the
   description of the change.
3. Report which entries matched and what each check found, including the
   ones that found nothing. An entry that is not mentioned was not applied.

The list is a floor. A review still looks for what no entry describes.

## What belongs here

An entry is added only when all three hold:

- **A trigger readable from a diff.** If spotting it needs knowledge the diff
  does not show, it belongs in the item's task document or in `AGENTS.md`.
- **Found twice.** Two reviews, or a review and a bug that escaped, in
  different changes. Once is recorded in that item's task document and no
  further.
- **No gate decides it.** If a test in `apps/web/src/server/spec/`, the type
  checker, Biome or CI would fail on it, the gate is the check and an entry
  here only costs the reviewer attention.

An entry is deleted in the same change that adds a gate for it, and when the
code it describes is gone. The list is kept short on purpose: every entry is
read on every review.

## Entries

| # | Trigger in the diff | Check | Behind it |
|---|---|---|---|
| 1 | `instanceof` against an error class, or a status, retry or branch chosen by an error's class | If the class is built by `error()` in `apps/web/src/server/utils/error.ts`, `instanceof` on it is always false: the constructor re-points each instance at its parent's prototype. Compare `error.name` with the class's `errorName`, never with its static `name`, which is the JavaScript class name. A plain `class X extends Error` is unaffected | `docs/tasks/llm-surface-scraping.md` § 10 finding 1 (13 Nov 2026); `api/dev/discovery/route.ts` maps an engine `ValidationError` to 500 instead of 400 by the same mistake (found 16 Nov 2026) |
