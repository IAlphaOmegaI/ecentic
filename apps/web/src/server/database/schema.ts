import { defineRelations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
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
  /** Write-only key for storefront beacons (Layer 1 tracker). */
  trackerApiKey: text("trackerApiKey"),
  /**
   * Hostnames allowed for CORS on /api/tracking/agent-visit (primary domain + myshopify domain).
   */
  storefrontHosts: jsonb("storefrontHosts").$type<string[] | null>(),
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

export const agentVisit = pgTable("agent_visit", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  storeId: text("storeId")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  productId: text("productId").references(() => product.id, {
    onDelete: "set null",
  }),
  externalProductId: text("externalProductId"),
  agentType: text("agentType").notNull(),
  agentCategory: text("agentCategory").notNull(),
  detectionMethod: text("detectionMethod").notNull(),
  detectionLayer: integer("detectionLayer").notNull().default(1),
  pageUrl: text("pageUrl").notNull(),
  pageType: text("pageType").notNull(),
  referrer: text("referrer"),
  userAgent: text("userAgent").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const agentTrafficDaily = pgTable("agent_traffic_daily", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  storeId: text("storeId")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  agentType: text("agentType").notNull(),
  agentCategory: text("agentCategory").notNull(),
  pageType: text("pageType").notNull(),
  visitCount: integer("visitCount").notNull().default(0),
  uniqueProducts: integer("uniqueProducts").notNull().default(0),
  productVisits: jsonb("productVisits"),
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
  agentVisit,
  agentTrafficDaily,
};

/** Relations */
export const relations = defineRelations(tables, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    stores: r.many.store(),
    products: r.many.product(),
    competitors: r.many.competitor(),
    scans: r.many.scan(),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  store: {
    user: r.one.user({
      from: r.store.userId,
      to: r.user.id,
    }),
    products: r.many.product(),
    agentVisits: r.many.agentVisit(),
    agentTrafficDaily: r.many.agentTrafficDaily(),
  },
  product: {
    store: r.one.store({
      from: r.product.storeId,
      to: r.store.id,
    }),
    user: r.one.user({
      from: r.product.userId,
      to: r.user.id,
    }),
  },
  competitor: {
    user: r.one.user({
      from: r.competitor.userId,
      to: r.user.id,
    }),
  },
  scan: {
    user: r.one.user({
      from: r.scan.userId,
      to: r.user.id,
    }),
    simulations: r.many.simulation(),
  },
  simulation: {
    scan: r.one.scan({
      from: r.simulation.scanId,
      to: r.scan.id,
    }),
    product: r.one.product({
      from: r.simulation.productId,
      to: r.product.id,
    }),
    competitor: r.one.competitor({
      from: r.simulation.competitorId,
      to: r.competitor.id,
    }),
  },
  ucpProfile: {
    user: r.one.user({
      from: r.ucpProfile.userId,
      to: r.user.id,
    }),
  },
  agentVisit: {
    store: r.one.store({
      from: r.agentVisit.storeId,
      to: r.store.id,
    }),
    user: r.one.user({
      from: r.agentVisit.userId,
      to: r.user.id,
    }),
    product: r.one.product({
      from: r.agentVisit.productId,
      to: r.product.id,
      optional: true,
    }),
  },
  agentTrafficDaily: {
    store: r.one.store({
      from: r.agentTrafficDaily.storeId,
      to: r.store.id,
    }),
    user: r.one.user({
      from: r.agentTrafficDaily.userId,
      to: r.user.id,
    }),
  },
}));
