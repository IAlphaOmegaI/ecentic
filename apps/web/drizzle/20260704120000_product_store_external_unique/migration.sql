-- Enforce one product per (storeId, externalId). Earlier re-syncs called an
-- unconditional insert with no unique constraint, so pressing "Sync" duplicated
-- the whole catalog. Before adding the unique index we must collapse any
-- existing duplicates, re-pointing child rows onto a single canonical product
-- (the earliest row per key) so simulation/optimization history survives.
--
-- The canonical row is chosen by (createdAt ASC, id ASC) — columns this
-- migration never mutates — so every statement below recomputes the same
-- mapping independently and stays correct regardless of how the runner splits
-- statements. Rows with a NULL externalId are left untouched (NULLs never
-- collide in a unique index).

-- Re-point simulations from duplicate products to their canonical product.
WITH ranked AS (
  SELECT
    p.id,
    first_value(p.id) OVER w AS canonical_id,
    row_number() OVER w AS rn
  FROM product p
  WHERE p."externalId" IS NOT NULL
  WINDOW w AS (
    PARTITION BY p."storeId", p."externalId"
    ORDER BY p."createdAt" ASC, p.id ASC
  )
)
UPDATE simulation s
SET "productId" = r.canonical_id
FROM ranked r
WHERE r.rn > 1 AND s."productId" = r.id;
--> statement-breakpoint

-- Re-point agent visits from duplicate products to their canonical product.
WITH ranked AS (
  SELECT
    p.id,
    first_value(p.id) OVER w AS canonical_id,
    row_number() OVER w AS rn
  FROM product p
  WHERE p."externalId" IS NOT NULL
  WINDOW w AS (
    PARTITION BY p."storeId", p."externalId"
    ORDER BY p."createdAt" ASC, p.id ASC
  )
)
UPDATE agent_visit a
SET "productId" = r.canonical_id
FROM ranked r
WHERE r.rn > 1 AND a."productId" = r.id;
--> statement-breakpoint

-- Collapse listing optimizations onto the canonical product, keeping a single
-- row per (userId, canonical product) so the re-point below cannot violate
-- listing_optimization_user_product_unique. Prefer a published row, then the
-- most recently updated.
WITH ranked AS (
  SELECT
    p.id,
    first_value(p.id) OVER w AS canonical_id,
    row_number() OVER w AS rn
  FROM product p
  WHERE p."externalId" IS NOT NULL
  WINDOW w AS (
    PARTITION BY p."storeId", p."externalId"
    ORDER BY p."createdAt" ASC, p.id ASC
  )
),
map AS (
  SELECT id AS dupe_id, canonical_id FROM ranked WHERE rn > 1
),
keep AS (
  SELECT id FROM (
    SELECT
      lo.id,
      row_number() OVER (
        PARTITION BY lo."userId", COALESCE(m.canonical_id, lo."productId")
        ORDER BY lo."publishedAt" DESC NULLS LAST, lo."updatedAt" DESC, lo.id ASC
      ) AS rn
    FROM listing_optimization lo
    LEFT JOIN map m ON lo."productId" = m.dupe_id
  ) ranked_lo
  WHERE ranked_lo.rn = 1
)
DELETE FROM listing_optimization
WHERE id NOT IN (SELECT id FROM keep);
--> statement-breakpoint

-- Re-point the surviving listing optimizations onto the canonical product.
WITH ranked AS (
  SELECT
    p.id,
    first_value(p.id) OVER w AS canonical_id,
    row_number() OVER w AS rn
  FROM product p
  WHERE p."externalId" IS NOT NULL
  WINDOW w AS (
    PARTITION BY p."storeId", p."externalId"
    ORDER BY p."createdAt" ASC, p.id ASC
  )
),
map AS (
  SELECT id AS dupe_id, canonical_id FROM ranked WHERE rn > 1
)
UPDATE listing_optimization lo
SET "productId" = m.canonical_id
FROM map m
WHERE lo."productId" = m.dupe_id;
--> statement-breakpoint

-- Remove the now child-free duplicate product rows.
WITH ranked AS (
  SELECT
    p.id,
    row_number() OVER (
      PARTITION BY p."storeId", p."externalId"
      ORDER BY p."createdAt" ASC, p.id ASC
    ) AS rn
  FROM product p
  WHERE p."externalId" IS NOT NULL
)
DELETE FROM product
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint

CREATE UNIQUE INDEX "product_store_external_unique" ON "product" USING btree ("storeId","externalId");
