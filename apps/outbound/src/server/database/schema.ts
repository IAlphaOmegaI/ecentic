import { defineRelations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { encryptedText } from "./encrypted-text";
import * as Outbound from "./outbound";

export * from "./outbound";

// Existing identity tables are shared with ecentic. This app never migrates or
// recreates them; the separate auth instance uses its own secret and cookies.
export const user = pgTable("user", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  // additionalFields from auth config
  surname: text("surname").notNull(),
  role: text("role"),
  jobTitle: text("jobTitle"),
  company: text("company"),
  source: text("source"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    // Better Auth 1.7+ keys external identities by (issuer, accountId).
    // Synthetic issuers: `local:credential` for password accounts,
    // `local:oauth:<providerId>` for OAuth providers without their own issuer.
    issuer: text("issuer").notNull(),
    accessToken: encryptedText("accessToken", "account.accessToken"),
    refreshToken: encryptedText("refreshToken", "account.refreshToken"),
    idToken: encryptedText("idToken", "account.idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("account_user_idx").on(table.userId),
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId,
    ),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const tables = { user, session, account, verification, ...Outbound };
export const relations = defineRelations(tables, (relations) => ({
  user: {
    sessions: relations.many.session(),
    accounts: relations.many.account(),
  },
  session: {
    user: relations.one.user({
      from: relations.session.userId,
      to: relations.user.id,
    }),
  },
  account: {
    user: relations.one.user({
      from: relations.account.userId,
      to: relations.user.id,
    }),
  },
}));
