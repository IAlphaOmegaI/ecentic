/**
 * Run from apps/web. Dry run by default; --write backfills/rotates credentials.
 * Requires the production encryption key to have been provisioned first.
 * Never logs values, row IDs, database URLs or underlying database errors.
 */
import { resultify } from "@zenncore/utils";
import postgres from "postgres";
import {
  credentialKeyIdentifier,
  decryptCredential,
  encryptCredential,
} from "../src/server/utils/credential-encryption";

const targets = [
  {
    table: "account",
    purpose: "account",
    fields: ["accessToken", "refreshToken", "idToken"],
  },
  {
    table: "store_account",
    purpose: "store_account",
    fields: [
      "accessToken",
      "refreshToken",
      "consumerKey",
      "consumerSecret",
      "bridgeSecret",
    ],
  },
  {
    table: "google_merchant_account",
    purpose: "googleMerchantAccount",
    fields: ["accessToken", "refreshToken"],
  },
] as const;

const write = process.argv.includes("--write");
const key = credentialKeyIdentifier();
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL must be configured explicitly");
const database = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

const execution = await resultify(async () => {
  for (const target of targets) {
    const counts = await database.begin(async (transaction) => {
      // Bound target identifiers only come from the literal allowlist above.
      const rows = await transaction<
        { id: string; [field: string]: string | null }[]
      >`
        SELECT ${transaction(["id", ...target.fields])}
        FROM ${transaction(target.table)} FOR UPDATE
      `;
      const pending = rows.filter((row) =>
        target.fields.some((field) => {
          const value = row[field];
          return (
            value !== null &&
            value !== undefined &&
            !value.startsWith(`ecentic.enc.v1:${key}:`)
          );
        }),
      );
      for (const row of rows) {
        const values = Object.fromEntries(
          target.fields.map((field) => {
            const value = row[field];
            if (value === null || value === undefined) return [field, null];
            // Also authenticate already-current envelopes; a dry run must not
            // report completion while a credential cannot be opened.
            const plaintext = decryptCredential(
              value,
              `${target.purpose}.${field}`,
              {
                key: process.env.CREDENTIAL_ENCRYPTION_KEY,
                previousKeys: process.env.CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS,
                allowLegacy: true,
              },
            );
            return [
              field,
              value.startsWith(`ecentic.enc.v1:${key}:`)
                ? value
                : encryptCredential(plaintext, `${target.purpose}.${field}`),
            ];
          }),
        );
        if (!write || !pending.includes(row)) continue;
        await transaction`UPDATE ${transaction(target.table)} SET ${transaction(values)} WHERE id = ${row.id}`;
      }
      return {
        rows: rows.length,
        pending: pending.length,
        rewritten: write ? pending.length : 0,
      };
    });
    console.log(
      JSON.stringify({
        table: target.table,
        mode: write ? "write" : "dry-run",
        ...counts,
      }),
    );
  }
});
await database.end();
if (!execution.success) {
  console.error(
    "Credential migration failed. No credential values were logged; investigate configuration and database availability before retrying.",
  );
  process.exitCode = 1;
}
