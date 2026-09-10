/**
 * Grants, extends and ends a no-card free trial on a real plan.
 *
 *   bun run scripts/grant-trial.ts grant  --email=will@example.com --plan=scale --days=90
 *   bun run scripts/grant-trial.ts extend --email=will@example.com --days=90
 *   bun run scripts/grant-trial.ts revoke --email=will@example.com
 *
 * A script rather than a page: this happens a handful of times a quarter, and a
 * UI for it is more surface area than the job is worth.
 *
 * `--days` on `extend` is counted FROM NOW, not added to the existing trial —
 * running `extend --days=90` in December is what turns three months into six.
 * It refuses to shorten a trial, and never opens a second subscription.
 *
 * Requires DATABASE_URL and STRIPE_SECRET_KEY, plus the STRIPE_SUB_<PLAN> price
 * id for the plan being granted. Note that `apps/web/.env.local` carries
 * PRODUCTION credentials — the banner below prints which database and which
 * Stripe mode this run is actually pointed at. Read it before answering yes to
 * anything.
 */
import * as Trial from "../src/server/app/billing/trial";
import { Environment } from "../src/server/utils/environment";

const USAGE = `Usage:
  bun run scripts/grant-trial.ts grant  --email=<email> --plan=<compete|scale|dominate> --days=<n>
  bun run scripts/grant-trial.ts extend --email=<email> --days=<n>
  bun run scripts/grant-trial.ts revoke --email=<email>`;

const [command, ...rest] = process.argv.slice(2);

const options = new Map<string, string>();
for (const argument of rest) {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (!match) continue;
  const [, key, value] = match;
  if (key !== undefined && value !== undefined) options.set(key, value);
}

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const required = (name: string) =>
  options.get(name) ?? fail(`Missing --${name}.\n\n${USAGE}`);

const number = (name: string) => {
  const raw = required(name);
  const value = Number(raw);
  if (!Number.isFinite(value)) fail(`--${name} must be a number, got "${raw}"`);
  return value;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) fail("DATABASE_URL is required.");

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey)
  fail(
    "STRIPE_SECRET_KEY is required. It is a Sensitive var in Vercel, so `vercel env pull` returns it empty — take it from apps/web/.env.local or the Stripe dashboard.",
  );

// Say out loud which account is about to be written to. `.env.local` in this
// repo points at production, and a trial granted against the wrong database is
// a support ticket nobody can see.
const host = (() => {
  try {
    return new URL(databaseUrl ?? "").host;
  } catch {
    return "unparseable";
  }
})();

console.log(
  `database: ${host}\nstripe:   ${secretKey?.startsWith("sk_live") ? "LIVE" : "test"}\n`,
);

/** Both zones, because "9 December" means two different instants to two people. */
const formatDate = (unix: number | null) => {
  if (unix === null) return "—";
  const date = new Date(unix * 1000);
  const zoned = (timeZone: string) =>
    date.toLocaleString("en-GB", {
      timeZone,
      dateStyle: "full",
      timeStyle: "short",
    });

  return `${zoned("Europe/Tirane")} (Europe/Tirane)\n            ${zoned("UTC")} (UTC)`;
};

const run = async () => {
  switch (command) {
    case "grant": {
      const result = await Trial.grant(Environment.SERVER, {
        email: required("email"),
        plan: required("plan"),
        days: number("days"),
      });

      if (!result.success) return fail(`grant failed: ${result.error.message}`);

      const { user, plan, subscription, status, trialEnd } = result.data;

      console.log(`granted     ${user.email} (${user.id})`);
      console.log(`plan        ${plan}`);
      console.log(`status      ${status}`);
      console.log(`trial ends  ${formatDate(trialEnd)}`);
      console.log(`stripe sub  ${subscription}`);
      return;
    }
    case "extend": {
      const result = await Trial.extend(Environment.SERVER, {
        email: required("email"),
        days: number("days"),
      });

      if (!result.success)
        return fail(`extend failed: ${result.error.message}`);

      const { user, subscription, status, previousTrialEnd, trialEnd } =
        result.data;

      console.log(`extended    ${user.email} (${user.id})`);
      console.log(`status      ${status}`);
      console.log(`was ending  ${formatDate(previousTrialEnd)}`);
      console.log(`now ends    ${formatDate(trialEnd)}`);
      console.log(`stripe sub  ${subscription}`);
      return;
    }
    case "revoke": {
      const result = await Trial.revoke(Environment.SERVER, {
        email: required("email"),
      });

      if (!result.success)
        return fail(`revoke failed: ${result.error.message}`);

      const { user, subscription, status } = result.data;

      console.log(`revoked     ${user.email} (${user.id})`);
      console.log(`status      ${status}`);
      console.log(`stripe sub  ${subscription}`);
      return;
    }
    default:
      fail(`Unknown command "${command ?? ""}".\n\n${USAGE}`);
  }
};

void run()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("grant-trial failed.");
    console.error(error);
    process.exit(1);
  });
