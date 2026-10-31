-- `/agents` run state.
--
-- Hand-written, like every migration since 20260602204248: `bun run db:generate`
-- is blocked by the journal defects in plans/012-migration-journal-repair.md.
--
-- IF NOT EXISTS because the table is already live: server/app/storefront/state.ts
-- created it at runtime from 2026-10-30, when no migration could be applied. This
-- is the same definition, so it does nothing where the table exists and leaves
-- its rows alone.
CREATE TABLE IF NOT EXISTS "agents_state" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone
);
