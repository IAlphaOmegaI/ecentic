/**
 * Notifies partner-deal redeemers that their plan is live.
 *
 * Recipients are passed explicitly rather than derived from `status = approved`:
 * the table carries no "notified" column, so a status-driven query would re-mail
 * everyone ever approved on each run. Pass the addresses you mean to contact.
 *
 *   bun run scripts/send-deal-approved.ts --dry-run a@x.com b@y.com
 *   bun run scripts/send-deal-approved.ts a@x.com b@y.com
 *
 * Requires DATABASE_URL, RESEND_API_KEY, FROM_EMAIL, APP_HOST.
 */
import { render } from "react-email";
import { Resend } from "resend";
import { DealApprovedEmail } from "../public/templates/deal-approved";
import { db, schema } from "../src/server/database";

const PROGRAM_NAMES: Record<string, string> = {
  ycombinator: "Y Combinator",
  techstars: "Techstars",
};

const SUBJECT = "Your ecentic deal is ready";

const arguments_ = process.argv.slice(2);
const isDryRun = arguments_.includes("--dry-run");
const recipients = arguments_.filter((value) => !value.startsWith("--"));

if (recipients.length === 0) {
  console.error("No recipients given. Pass one or more email addresses.");
  process.exit(1);
}

const appHost = process.env.APP_HOST ?? "https://ecentic.ai";

const rows = await db
  .select()
  .from(schema.dealRedemption)
  .catch((error: unknown) => {
    console.error("Could not read redemptions:", error);
    process.exit(1);
  });

// Most recent row per address wins — a founder who redeemed twice should be
// addressed by their latest submission, and status gates the coupon anyway.
const latest = new Map<string, (typeof rows)[number]>();
for (const row of [...rows].sort(
  (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
))
  latest.set(row.email.toLowerCase(), row);

const targets = recipients.map((email) => {
  const row = latest.get(email.toLowerCase());
  if (!row) throw new Error(`No redemption found for ${email}`);
  if (row.status !== "approved")
    throw new Error(`Redemption for ${email} is "${row.status}", not approved`);
  return row;
});

// Constructed only when actually sending: Resend throws on a missing key at
// construction time, which would make a dry run need production credentials.
const resend = isDryRun ? null : new Resend(process.env.RESEND_API_KEY);

for (const target of targets) {
  const programName = PROGRAM_NAMES[target.merchant] ?? target.merchant;

  // "Unknown" is what the webhook stores when a payload carries no readable
  // name; greeting a founder as "Hi Unknown" is worse than greeting them as
  // "there".
  const contactName = (() => {
    if (!target.contactName || target.contactName === "Unknown") return "there";
    return target.contactName.split(" ")[0] ?? "there";
  })();

  const element = DealApprovedEmail({
    contactName,
    userEmail: target.email,
    programName,
    signUpUrl: `${appHost}/sign-up`,
  });

  if (isDryRun) {
    const text = await render(element, { plainText: true });
    console.log(`\n${"=".repeat(70)}`);
    console.log(`To:      ${target.email}`);
    console.log(`From:    ${process.env.FROM_EMAIL ?? "(FROM_EMAIL unset)"}`);
    console.log(`Subject: ${SUBJECT}`);
    console.log(`${"=".repeat(70)}\n${text}`);
    continue;
  }

  if (!resend) continue;

  const html = await render(element);
  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL ?? "onboarding@resend.dev",
    to: target.email,
    subject: SUBJECT,
    html,
  });

  if (result.error) {
    console.error(`FAILED ${target.email}:`, result.error);
    continue;
  }

  console.log(`sent ${target.email} (${result.data?.id})`);
}

if (isDryRun) console.log("\nDry run — nothing was sent.");

process.exit(0);
