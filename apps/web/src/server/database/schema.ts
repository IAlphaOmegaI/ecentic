import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
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
  structuredData: text("structuredData"),
  syncedAt: timestamp("syncedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const competitor = pgTable("competitor", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  currency: text("currency").default("USD"),
  image: text("image"),
  url: text("url"),
  source: text("source"),
  brand: text("brand"),
  selected: boolean("selected").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const scan = pgTable("scan", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  totalSimulations: integer("totalSimulations").notNull().default(0),
  completedSimulations: integer("completedSimulations").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  topFinding: text("topFinding"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const ucpProfile = pgTable("ucp_profile", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  merchantName: text("merchantName"),
  description: text("description"),
  logoUrl: text("logoUrl"),
  paymentMethods: text("paymentMethods"),
  shippingPolicy: text("shippingPolicy"),
  returnPolicy: text("returnPolicy"),
  contactEmail: text("contactEmail"),
  sustainability: text("sustainability"),
  certifications: text("certifications"),
  generatedJson: text("generatedJson"),
  autoUpdate: boolean("autoUpdate").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const simulation = pgTable("simulation", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  scanId: text("scanId")
    .notNull()
    .references(() => scan.id, { onDelete: "cascade" }),
  productId: text("productId")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  competitorId: text("competitorId")
    .notNull()
    .references(() => competitor.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  winner: text("winner").notNull(),
  reasoning: text("reasoning"),
  productScore: integer("productScore"),
  competitorScore: integer("competitorScore"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

/** Tables object for defineRelations and better-auth adapter */
export const tables = {
  user,
  session,
  account,
  verification,
  store,
  product,
  competitor,
  scan,
  simulation,
  ucpProfile,
};

/** Relations */
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  stores: many(store),
  products: many(product),
  competitors: many(competitor),
  scans: many(scan),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const storeRelations = relations(store, ({ one, many }) => ({
  user: one(user, { fields: [store.userId], references: [user.id] }),
  products: many(product),
}));

export const productRelations = relations(product, ({ one }) => ({
  store: one(store, { fields: [product.storeId], references: [store.id] }),
  user: one(user, { fields: [product.userId], references: [user.id] }),
}));

export const competitorRelations = relations(competitor, ({ one }) => ({
  user: one(user, { fields: [competitor.userId], references: [user.id] }),
}));

export const scanRelations = relations(scan, ({ one, many }) => ({
  user: one(user, { fields: [scan.userId], references: [user.id] }),
  simulations: many(simulation),
}));

export const simulationRelations = relations(simulation, ({ one }) => ({
  scan: one(scan, { fields: [simulation.scanId], references: [scan.id] }),
  product: one(product, { fields: [simulation.productId], references: [product.id] }),
  competitor: one(competitor, { fields: [simulation.competitorId], references: [competitor.id] }),
}));

export const ucpProfileRelations = relations(ucpProfile, ({ one }) => ({
  user: one(user, { fields: [ucpProfile.userId], references: [user.id] }),
}));
