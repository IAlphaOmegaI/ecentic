/**
 * Flips partner-deal redemptions to `approved`, the state the checkout gate and
 * `send-deal-approved.ts` both read.
 *
 * Selection is by program, not by "everything pending", so approving the YC
 * backlog can never quietly approve a Techstars row that was left pending on
 * purpose. `--dry-run` prints the rows and changes nothing.
 *
 *   bun run scripts/approve-deal-redemptions.ts --dry-run ycombinator
 *   bun run scripts/approve-deal-redemptions.ts ycombinator
 *
 * Requires DATABASE_URL.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "../src/server/database";
import { isDealKey } from "../src/server/utils/stripe";

const arguments_ = process.argv.slice(2);
const isDryRun = arguments_.includes("--dry-run");
const programs = arguments_.filter((value) => !value.startsWith("--"));

if (programs.length === 0) {
  console.error("No program given. Pass one or more, e.g. ycombinator.");
  process.exit(1);
}

const unknown = programs.filter((program) => !isDealKey(program));
if (unknown.length > 0) {
  console.error(`Unknown deal program(s): ${unknown.join(", ")}`);
  process.exit(1);
}

for (const program of programs) {
  const pending = await db
    .select()
    .from(schema.dealRedemption)
    .where(
      and(
        eq(schema.dealRedemption.merchant, program),
        eq(schema.dealRedemption.status, "pending"),
      ),
    );

  console.log(`\n${program}: ${pending.length} pending`);

  for (const row of pending)
    console.log(
      `  ${row.createdAt.toISOString().slice(0, 10)}  ${row.email}  ${row.contactName}  ${row.companyName}  ${row.website ?? "no site"}`,
    );

  if (pending.length === 0) continue;

  if (isDryRun) {
    console.log("  (dry run — nothing changed)");
    continue;
  }

  const approved = await db
    .update(schema.dealRedemption)
    .set({ status: "approved", updatedAt: new Date() })
    .where(
      and(
        eq(schema.dealRedemption.merchant, program),
        eq(schema.dealRedemption.status, "pending"),
      ),
    )
    .returning({ email: schema.dealRedemption.email });

  console.log(`  approved ${approved.length}`);
  console.log(
    `  next: bun run scripts/send-deal-approved.ts ${approved.map((row) => row.email).join(" ")}`,
  );
}

process.exit(0);
