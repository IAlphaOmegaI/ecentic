# ecentic current role and team check

Reusable **draft configuration**, version 1. Configure its criteria with the
[setup questionnaire](../../../../docs/integrations/outbound-claude-questions.md)
and [launch configuration](../../../../docs/integrations/outbound-launch-decisions.md).
No workflow ID, account connection, live result or verification receipt is bundled.
This directory has no credentials and its renderer never calls Clay.

The graph is a manual trigger, one regular Claygent with public web research, and
one Python code node. The Claygent opens and reopens sources for the current
person/company and an explicit team count. The code validates the returned shape,
source identity, source URL, role category, quoted count and conflicting evidence.
It returns a role/team recommendation for Outbound's human review queue.

## Inputs and output

The manual trigger accepts `domain`, `name`, `linkedin_url`, `email`, `title`, and
`company`. `domain` and `title` are required; at least `name` or `linkedin_url` must
be present. Outbound must reject missing identity **before reserving paid work**.
Send optional absent values as empty strings. Email is only an accepted match hint;
it is not passed to web research and is never verified by this workflow. Inputs
must come from the chosen contact, not guesses.

The final code output is `{ "facts": { ... } }`. It covers the field dictionary's
`routine`, `routine_version`, `item_status`, `outcome`, `reason_codes`, `person`,
`company` and `suggested` fields. Company business type and HQ remain unknown;
the routine does not expand into company qualification or drafting.

`pass` means a supported current target role plus a sourced count of at least
three people. Founder/CEO recommendations require a known count below twenty.
Unknown, partial or range headcount stays null. A supported departure yields
`exclude`; conflicting evidence takes precedence and stays `hold`. A title
disagreement with Apollo remains held. Existing funding/distribution evidence can
be evaluated by Outbound's reviewer when headcount is unknown; this workflow does
not silently invent it. A `pass` is **only a research suggestion**, never approval,
email deliverability verification, complete company qualification or permission
to send. `requires_human_review` is always true.

### Dates and evidence

The provider label is `Clay web research`. `person.observed_at` and the headcount
observation date are the UTC date of this workflow's research cycle, set by the
code-node clock after the Claygent reports reopening the source. They are **not**
the source publication date, provider profile freshness or email verification.
Publication dates, when present, remain separate in `evidence`.

The normalizer can validate shape and consistency; it cannot independently prove
that an LLM opened a URL or that quoted source text is truthful. The
`source_opened_reported` label preserves that limitation. Inspect the actual
Claygent run/tool evidence and manually spot-check output before operational use.
The workflow never fabricates a provider receipt: `verification_receipt` is null.
When no usable role source exists, `person.observed_at` is null, an intentional
correction to the source brief's non-null date requirement for unknown evidence.

`id` must come unchanged from the Public API result item's `id`. `run_id` comes
from the real API run; `completed_at` comes from trusted completion metadata or a
clearly labeled Outbound completion-observed timestamp. These fields are added
by Outbound, never by the Claygent. A workflow step does not know the outer
routine-run ID. Do not substitute a workflow execution ID. Retain the raw result
and request association; quarantine unknown item IDs and replays. Do not overwrite
human-reviewed fields or upgrade a held contact automatically.

## Prepare and connect the draft

Use the official Clay CLI in the selected workspace. Authentication and changes
to Clay are separate from rendering these local files. Before creating anything,
page through `clay routines list`, inspect any relevant existing routine with
`clay routines get`, and reuse a suitable existing one. Read the current workflow
graph before resuming a partially created draft; do not duplicate it.

1. Create a workflow named `ecentic role and team check`. Save the actual returned
   ID and URL outside this configuration; share the URL with the owner.
2. Create its manual trigger using `trigger.json`. Read the trigger back. Its
   `workflowNodeId`, not the trigger's `resourceId`, is the canvas source ID.
3. Render the research node with that actual ID:

   ```sh
   python3 render.py --trigger-node <actual-node-id> --destination <scratch-directory>
   ```

4. Create the research node from the rendered `research.node.json`. Its
   `agentName` and `agentPrompt` are sent together; no model is forced. Enable web
   research with the rendered `research.web-search.json` through
   `clay workflows nodes update`. Read the node and its linked Claygent back:
   `agentInternetSearchEnabled` / `internetSearchEnabled` must be true. Agent-node
   `tools: []` does not mean web research is unavailable.
5. Run the renderer again with `--research-node <actual-research-node-id>` to
   produce `normalize.node.json`. It pins each input to its original node rather
   than copying an accumulated state object through the graph.
6. Before saving the code node, validate `normalize.py` in Clay's code runtime
   against `output-schema.json`, using explicitly synthetic input. Require
   `isError != true` and `outputSchemaValidated == true`; exit code zero alone is
   insufficient. Then create the node and read it back. A local Python test does
   not prove the workspace allows code nodes or the runtime supports all imports.
7. Run `clay workflows graph validate <actual-workflow-id>`. Read the full graph
   and confirm trigger → research → normalization with no other action/trigger.
8. Within the authorized test scope, preflight actual cost/balance and test one
   real chosen contact with `clay workflows runs test`. Inspect the final code
   output, research sources and terminal status. Do not retry an uncertain paid
   start. No batch, schedule, webhook, email or Audiences write is part of setup.
9. Register with `clay routines create workflow <actual-workflow-id> --name
   "ecentic role and team check"`. The callable identifier is
   `workflow:<actual-workflow-id>`, not the raw workflow ID or a `function:` ID.
   Read it with `clay routines get`; confirm all six input names and the real
   output mapping. Publishing and live activation are a separate step:
   `clay workflows publish <actual-workflow-id>`.
10. Verify one authorized Public API call through the existing Outbound adapter,
    including the actual wrapper around `facts`, terminal results, unchanged
    item ID and polling. Only then save its callable routine ID in Outbound.
    Registering or validating a graph does not prove the API result shape.

The nullable fact dictionary is nested under an `object` output because Clay's
flat output fields do not support nullable unions. The Python handler validates
the inner types. Do not relabel null data as an empty string/zero to satisfy a
schema. A runtime/schema capability error requires correction, not a false
success or bypass of the deterministic check.

## What remains to verify live

Regular Claygents have built-in web research; no named enrichment provider or
action catalog entry is required for this initial graph. Still verify available
workspace routines, actual web access on the linked Claygent, code-node support,
manual-trigger input schemas, routine registration and output selection. If
blocked sources require a dedicated enrichment action, discover it in this
workspace's action catalog and inspect its real source/date/output fields before
adding it. Do not invent provider names or substitute a new paid lookup silently.

The one-record test establishes plumbing, not quality at scale. The source brief
proposes a separate 20-record review and a 90% definite-role target; neither is a
reported result or an automatically authorized batch. Measure actual charges,
not a guessed per-item cost. The first email, follow-ups and every other existing
Outbound approval gate remain independently enforced.

## Offline checks

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest test_normalize.py
```

All fixtures use synthetic `example.com` data. They exercise malformed responses,
blocked/private sources, identity mismatch, count ranges, provider conflicts,
departures, founder size limits and timestamp provenance. They are not provider
receipts and must never be imported as prospects.

## Current official references

- [Workflow graph and routine registration](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/workflows/SKILL.md)
- [Regular Claygent web research and output schema](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/workflows-claygent/SKILL.md)
- [Data passing and nullable schema constraints](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/workflows/data-passing.md)
- [Routine execution](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/routines/SKILL.md)
- [Draft versus publish](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/workflows/publishing.md)
- [Cost policy](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/workflows-discover-actions/cost-and-budget.md)

Payloads were prepared against official Clay CLI 1.19.0 help and the current
official plugin source on 14 November 2026. Live writable fields are dynamic per
workspace; read back saved configuration and use the actual validation messages.
