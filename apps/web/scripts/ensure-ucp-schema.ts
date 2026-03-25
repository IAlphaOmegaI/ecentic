/**
 * Applies UCP-related DDL idempotently when `bun run db:migrate` cannot run
 * (e.g. migration history out of sync with a DB created via `db:push`).
 *
 * Safe to run multiple times.
 */
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });

const statements = [
  `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "ucpOfferJson" jsonb`,
  `CREATE TABLE IF NOT EXISTS "ucp_audit" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"score" integer NOT NULL,
	"gaps" jsonb NOT NULL,
	"specVersion" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS "ucp_audit_user_product_created_idx" ON "ucp_audit" ("userId","productId","createdAt")`,
  `DO $$ BEGIN
  ALTER TABLE "ucp_audit" ADD CONSTRAINT "ucp_audit_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$`,
  `DO $$ BEGIN
  ALTER TABLE "ucp_audit" ADD CONSTRAINT "ucp_audit_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$`,
];

async function main() {
  console.log("Applying UCP schema (idempotent)…");
  for (const statement of statements) {
    await client.unsafe(statement);
  }
  await client.end();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
