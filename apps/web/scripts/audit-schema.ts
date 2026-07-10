/**
 * Read-only schema audit. Reports which of the recent migrations an environment
 * has actually applied. Issues SELECTs against information_schema only — it
 * never writes, and never issues DDL.
 *
 * Usage:  DATABASE_URL='<url>' bun run scripts/audit-schema.ts
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const columns = await sql<
  { table_name: string; column_name: string; is_nullable: string }[]
>`
  select table_name, column_name, is_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('subscription', 'store', 'fee_period', 'attributed_conversion')
`;

const tables = await sql<{ table_name: string }[]>`
  select table_name from information_schema.tables
  where table_schema = 'public'
    and table_name in ('fee_period', 'attributed_conversion')
`;

const has = (table: string, column: string) =>
  columns.some((c) => c.table_name === table && c.column_name === column);
const nullable = (table: string, column: string) =>
  columns.find((c) => c.table_name === table && c.column_name === column)
    ?.is_nullable === "YES";
const hasTable = (table: string) => tables.some((t) => t.table_name === table);

// 20260707120000_performance_fee
const performanceFee = {
  "store.shopifyUsageLineId": has("store", "shopifyUsageLineId"),
  "subscription.performanceFeeEnabled": has(
    "subscription",
    "performanceFeeEnabled",
  ),
  "subscription.performanceFeeRateBps": has(
    "subscription",
    "performanceFeeRateBps",
  ),
  "subscription.performanceFeeCapCents": has(
    "subscription",
    "performanceFeeCapCents",
  ),
  "fee_period (table)": hasTable("fee_period"),
  "attributed_conversion (table)": hasTable("attributed_conversion"),
};

// 20260708120000_pay_as_you_go
const payAsYouGo = {
  "subscription.billingMode": has("subscription", "billingMode"),
  "subscription.stripePerformanceItemId dropped": !has(
    "subscription",
    "stripePerformanceItemId",
  ),
  "subscription.stripeCustomerId nullable": nullable(
    "subscription",
    "stripeCustomerId",
  ),
  "fee_period.state": has("fee_period", "state"),
};

const report = (name: string, checks: Record<string, boolean>) => {
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.values(checks).length;
  const state =
    passed === total ? "APPLIED" : passed === 0 ? "NOT APPLIED" : "PARTIAL";
  console.log(`\n${name}: ${state} (${passed}/${total})`);
  for (const [check, ok] of Object.entries(checks))
    console.log(`  ${ok ? "✓" : "✗"} ${check}`);
};

console.log(`host: ${new URL(url).host}`);
report("20260707120000_performance_fee", performanceFee);
report("20260708120000_pay_as_you_go", payAsYouGo);

const tracked =
  await sql`select count(*)::int as count from drizzle.__drizzle_migrations`.catch(
    () => [{ count: null }],
  );
console.log(
  `\ndrizzle.__drizzle_migrations rows: ${tracked[0]?.count ?? "(table absent)"}`,
);

await sql.end();
