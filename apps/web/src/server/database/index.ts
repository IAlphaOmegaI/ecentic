import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Postgres client for server-side only (no connection in edge runtime by default).
 * For serverless, use a connection pooler (e.g. PgBouncer) or pool with max 1.
 */
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Drizzle instance with schema for typed queries and relations.
 * Use this with better-auth's drizzleAdapter and with the repository helper.
 */
export const db = drizzle(client, { schema });

export { schema };
export type {
  account,
  session,
  user,
  verification,
  store,
  product,
} from "./schema";
