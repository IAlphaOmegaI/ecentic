-- One judge verdict per (scan, product, competitor, model).
--
-- The engine's resume path already keys on exactly this tuple to decide what
-- still needs judging, and the stale-scan reaper's heartbeat keeps a live
-- worker from being requeued, so duplicates are a narrow race today rather
-- than routine. The index is what keeps them impossible once competitor
-- pairing is generated rather than hand-picked — a duplicate row here does not
-- just clutter the table, it double-counts a win.
--
-- Hand-written: `drizzle-kit generate` is unusable in this repo (forked
-- migration lineage, no `drizzle/meta` journal). Re-runnable by design — apply
-- it twice to prove it.

-- Keep the newest row in each duplicate group. Ordering on (createdAt, id)
-- rather than createdAt alone makes the survivor deterministic when two rows
-- share a timestamp; a second run finds no pairs and deletes nothing.
DELETE FROM "simulation" older
USING "simulation" newer
WHERE older."scanId" = newer."scanId"
  AND older."productId" = newer."productId"
  AND older."competitorId" = newer."competitorId"
  AND older."model" = newer."model"
  AND (older."createdAt", older."id") < (newer."createdAt", newer."id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "simulation_pair_unique" ON "simulation" USING btree ("scanId","productId","competitorId","model");
