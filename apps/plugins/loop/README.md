# @ecentic/loop

Loop Returns transport and return-signal primitives. All data operations require one store identifier. The connector only reads return data; the only writes available are creating and deleting this integration's own webhook subscriptions.

`LoopClient` requires a `beforeRequest` callback that atomically reserves each request in persistent, store-scoped API and auth buckets. There is no process-local limiter fallback. The web integration owns authorization, encrypted credential storage, generation fencing, job checkpoints and persistence. Only sanitized projections leave this package; raw provider bodies and customer objects are never returned or included in errors.

Returns/webhook calls pin API `2026-10`. The documented identity endpoint remains `/api/v1/auth/me`. OAuth helpers require an explicit enabled flag and confirmed scopes; partner returns scopes, PKCE support and API-key identity support remain `TODO(loop-confirm)`. The callback for token refresh must persist replacements before resolving. Webhook signing secrets come from the merchant's Loop Developer Tools page.

Run `bun test apps/plugins/loop/src` from the repository root. The application runbook and partner review checklist are under `docs/integrations/loop*.md`.
