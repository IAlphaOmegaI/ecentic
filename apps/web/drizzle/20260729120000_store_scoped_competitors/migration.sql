-- Store-scoped competitors: a competitor now belongs to one store instead of
-- the whole account, so a WooCommerce catalog is no longer judged against the
-- rivals detected for a Shopify catalog, and `selected` becomes a per-store
-- roster flag. The same real-world rival present in two stores becomes two
-- rows, the way `product` already duplicates across stores.
--
-- Backfill splits existing rows by the stores they were actually simulated
-- against: the lowest-ranked store keeps the original row (and its id), every
-- further store gets a copy, and each simulation is repointed to the copy that
-- matches its product's store so no scan history is lost. Competitors that were
-- never simulated cannot be attributed and fall back to their owner's newest
-- store; ones whose owner has no store at all are unscopeable and are dropped.
--
-- Guards make the migration idempotent.

ALTER TABLE "competitor" ADD COLUMN IF NOT EXISTS "storeId" text;
--> statement-breakpoint
-- Every (competitor, store) pair the simulation history proves, ranked so the
-- assignment is deterministic on re-run.
CREATE TEMP TABLE "competitor_store_pair" AS
SELECT
  "competitorId",
  "storeId",
  row_number() OVER (PARTITION BY "competitorId" ORDER BY "storeId") AS "rank"
FROM (
  SELECT DISTINCT
    s."competitorId" AS "competitorId",
    p."storeId"      AS "storeId"
  FROM "simulation" s
  JOIN "product" p ON p.id = s."productId"
  WHERE p."storeId" IS NOT NULL
) pairs;
--> statement-breakpoint
-- Rank 1 keeps the original row, so its simulations need no repointing.
UPDATE "competitor" c
SET "storeId" = pair."storeId"
FROM "competitor_store_pair" pair
WHERE pair."competitorId" = c.id
  AND pair."rank" = 1
  AND c."storeId" IS NULL;
--> statement-breakpoint
-- Ranks 2+ become per-store copies of the original.
CREATE TEMP TABLE "competitor_clone" AS
SELECT
  pair."competitorId"      AS "originId",
  pair."storeId"           AS "storeId",
  gen_random_uuid()::text  AS "cloneId"
FROM "competitor_store_pair" pair
WHERE pair."rank" > 1;
--> statement-breakpoint
INSERT INTO "competitor" (
  "id", "userId", "storeId", "title", "description", "price", "currency",
  "image", "url", "source", "brand", "selected", "createdAt", "updatedAt"
)
SELECT
  clone."cloneId", c."userId", clone."storeId", c."title", c."description",
  c."price", c."currency", c."image", c."url", c."source", c."brand",
  c."selected", c."createdAt", c."updatedAt"
FROM "competitor_clone" clone
JOIN "competitor" c ON c.id = clone."originId";
--> statement-breakpoint
-- Each simulation follows its product's store to the matching copy.
UPDATE "simulation" s
SET "competitorId" = clone."cloneId"
FROM "competitor_clone" clone, "product" p
WHERE p.id = s."productId"
  AND s."competitorId" = clone."originId"
  AND p."storeId" = clone."storeId";
--> statement-breakpoint
-- Never-simulated competitors carry no evidence of a store — fall back to their
-- owner's newest one, which is the store onboarding would have detected them for.
UPDATE "competitor" c
SET "storeId" = newest.id
FROM (
  SELECT DISTINCT ON ("userId") "userId", id
  FROM "store"
  ORDER BY "userId", "createdAt" DESC
) newest
WHERE c."storeId" IS NULL
  AND newest."userId" = c."userId";
--> statement-breakpoint
-- Anything still unscoped belongs to a user with no store at all; there is no
-- store to attach it to and nothing referencing it that is worth keeping.
DELETE FROM "competitor" WHERE "storeId" IS NULL;
--> statement-breakpoint
ALTER TABLE "competitor" ALTER COLUMN "storeId" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "competitor" ADD CONSTRAINT "competitor_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_store_idx" ON "competitor" ("storeId");
