import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { relations, tables } from "./schema";

/**
 * Postgres client for server-side only (no connection in edge runtime by default).
 * For serverless, use a connection pooler (e.g. PgBouncer) or pool with max 1.
 */
const client = postgres(process.env.DATABASE_URL, {
  // Neon's pooler does the real pooling; this local pool only needs to cover
  // one instance. Fluid compute serves concurrent requests per instance over
  // this shared client, and postgres.js queues (not errors) past `max`, so
  // leave headroom for parallel Suspense/`Promise.all` queries.
  max: 5,
  idle_timeout: 20, 
  // One production connect exceeded 10s (Sentry ECENTIC-CD). Neon documents
  // scale-to-zero resumes at ~500ms to a few seconds, so 15s adds margin over
  // any slow-but-recoverable connect without hanging uncached routes for long
  // when the database is genuinely unreachable.
  connect_timeout: 15,
});

/**
 * Drizzle instance with schema for typed queries and relations.
 * Use this with better-auth's drizzleAdapter and with the repository helper.
 */
export const db = drizzle({ client, relations });

export type TransactionScope = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export const withTransaction = <T>(
  callback: (tx: TransactionScope) => Promise<T>,
): Promise<T> => db.transaction(callback);

export type {
  account,
  product,
  session,
  store,
  subscription,
  ucpProfile,
  user,
  verification,
} from "./schema";
export { tables as schema };
