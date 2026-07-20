import crypto from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

/**
 * One-time repair for the production drizzle migration journal.
 *
 * Background: production's `drizzle.__drizzle_migrations` table only recorded an
 * early prefix of migrations (through `20260312231915_legal_eternity`).
 * Everything from `20260315133439_flimsy_roughhouse` onward was applied to the
 * physical schema out-of-band (db:push / manual SQL) and never recorded. The RC
 * migrator decides "already applied?" purely by matching a migration's directory
 * name against the `name` column, so it replays those unrecorded migrations and
 * crashes on `CREATE TABLE "ucp_profile"` — the table already exists.
 *
 * This backfills the missing bookkeeping rows so `drizzle-kit migrate` skips the
 * already-applied migrations and only runs genuinely new ones.
 *
 * Safe to re-run: only migrations at/before CUTOFF are considered, only rows
 * whose name is not already present are inserted, and it no-ops on a fresh /
 * un-upgraded tracking table (where the physical schema is NOT ahead).
 */

// Newest migration KNOWN to already be applied in production. Anything newer
// than this must actually run through db:migrate — do NOT bump this casually.
// NOTE: store_scoped_scans / scan_roster were NOT applied to prod (the missing
// scan.storeId column proves it), so the cutoff must sit BELOW them — otherwise
// repair marks them applied and db:migrate skips creating the columns.
const CUTOFF = "20260708120000_pay_as_you_go";

const migrationsDir = fileURLToPath(new URL("../drizzle", import.meta.url));

const formatToMillis = (name: string) => {
  const stamp = name.slice(0, 14);
  return Date.UTC(
    Number(stamp.slice(0, 4)),
    Number(stamp.slice(4, 6)) - 1,
    Number(stamp.slice(6, 8)),
    Number(stamp.slice(8, 10)),
    Number(stamp.slice(10, 12)),
    Number(stamp.slice(12, 14)),
  );
};

async function repair() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[repair] DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(databaseUrl, { max: 1 });
  try {
    const tableColumns = await client<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
    `;
    const hasNameColumn = tableColumns.some((row) => row.column_name === "name");
    if (!hasNameColumn) {
      console.log(
        "[repair] drizzle.__drizzle_migrations is missing / not in the name-aware format — " +
          "nothing to repair (fresh database, or run db:migrate once to upgrade it first)",
      );
      return;
    }

    const recordedRows = await client<{ name: string }[]>`
      SELECT name FROM drizzle.__drizzle_migrations WHERE name IS NOT NULL
    `;
    const recorded = new Set(recordedRows.map((row) => row.name));
    if (recorded.size === 0) {
      console.log("[repair] tracking table has no recorded migrations — nothing to repair");
      return;
    }

    const migrations = readdirSync(migrationsDir)
      .filter((name) => existsSync(join(migrationsDir, name, "migration.sql")))
      .sort((a, b) => a.localeCompare(b));
    const missing = migrations.filter((name) => name <= CUTOFF && !recorded.has(name));

    console.log(`[repair] ${recorded.size} migrations already recorded`);
    console.log(`[repair] backfilling ${missing.length} already-applied migration(s) (<= ${CUTOFF})`);

    for (const name of missing) {
      const content = readFileSync(join(migrationsDir, name, "migration.sql")).toString();
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      const createdAt = formatToMillis(name);
      await client`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)
        VALUES (${hash}, ${createdAt}, ${name})
      `;
      console.log(`[repair]   + ${name}`);
    }

    console.log(
      missing.length > 0
        ? "[repair] done — run db:migrate to apply the genuinely-new migrations"
        : "[repair] nothing to backfill — journal already healthy",
    );
  } finally {
    await client.end();
  }
}

repair().catch((error) => {
  console.error("[repair] failed:", error);
  process.exit(1);
});
