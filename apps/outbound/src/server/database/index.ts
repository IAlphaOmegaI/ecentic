import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { relations, tables } from "./schema";

const endpoint = process.env.DATABASE_URL;
if (!endpoint) throw new Error("DATABASE_URL is required for Outbound.");

const client = postgres(endpoint, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 15,
});

export const db = drizzle({ client, relations });
export type TransactionScope = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export const withTransaction = <T>(
  callback: (transaction: TransactionScope) => Promise<T>,
): Promise<T> => db.transaction(callback);

export type { account, session, user, verification } from "./schema";
export { tables as schema };
