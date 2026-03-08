import { relations, sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Better-auth core schema (compatible with drizzleAdapter).
 * Table/column names match better-auth defaults; use adapter schema option if you rename.
 */

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
});

export const session = pgTable("session", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const store = pgTable("store", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  accessToken: text("accessToken"),
  consumerKey: text("consumerKey"),
  consumerSecret: text("consumerSecret"),
  feedUrl: text("feedUrl"),
  status: text("status").notNull().default("connected"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const product = pgTable("product", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  storeId: text("storeId")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  externalId: text("externalId"),
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  compareAtPrice: text("compareAtPrice"),
  currency: text("currency").default("USD"),
  images: text("images").default("[]"),
  url: text("url"),
  sku: text("sku"),
  status: text("status").default("active"),
  rawData: text("rawData"),
  syncedAt: timestamp("syncedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

/** Relations */
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  stores: many(store),
  products: many(product),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const storeRelations = relations(store, ({ one, many }) => ({
  user: one(user, {
    fields: [store.userId],
    references: [user.id],
  }),
  products: many(product),
}));

export const productRelations = relations(product, ({ one }) => ({
  store: one(store, {
    fields: [product.storeId],
    references: [store.id],
  }),
  user: one(user, {
    fields: [product.userId],
    references: [user.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  store,
  product,
};
