import { defineRelations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type * as Simulate from "@/server/app/intelligence/simulate";

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
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const store = pgTable(
  "store",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** External platform store id (Shopify numeric shop id). Only known for OAuth integrations. */
    storeId: text("storeId"),
    platform: text("platform").notNull(),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
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
  },
  (table) => [index("store_user_idx").on(table.userId)],
);

export const store_account = pgTable("store_account", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  storeId: text("storeId")
    .notNull()
    .unique()
    .references(() => store.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"), // shopify access token
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
    mode: "date",
  }), // shopify access token expires at
  refreshToken: text("refreshToken"), // shopify refresh token
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
    mode: "date",
  }), // shopify refresh token expires at
  // wooCommerceConsumerKey: text("wooCommerceConsumerKey"),
  // wooCommerceConsumerSecret: text("wooCommerceConsumerSecret"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const product = pgTable(
  "product",
  {
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
  },
  (table) => [
    index("product_user_idx").on(table.userId),
    index("product_store_idx").on(table.storeId),
  ],
);

export const competitor = pgTable(
  "competitor",
  {
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
  },
  (table) => [index("competitor_user_idx").on(table.userId)],
);

export const scan = pgTable(
  "scan",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"pending" | "running" | "complete" | "failed">()
      .notNull()
      .default("pending"),
    totalSimulations: integer("totalSimulations").notNull().default(0),
    completedSimulations: integer("completedSimulations").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    topFinding: jsonb("topFinding").$type<Simulate.TopFinding>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("scan_user_created_idx").on(table.userId, table.createdAt),
    index("scan_status_idx").on(table.status),
  ],
);

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

export const simulation = pgTable(
  "simulation",
  {
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
  },
  (table) => [
    index("simulation_scan_idx").on(table.scanId),
    index("simulation_product_idx").on(table.productId),
    index("simulation_competitor_idx").on(table.competitorId),
  ],
);

export const agentVisit = pgTable(
  "agent_visit",
  {
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
  },
  (table) => [
    index("agent_visit_user_created_idx").on(table.userId, table.createdAt),
    index("agent_visit_store_created_idx").on(table.storeId, table.createdAt),
  ],
);

export const agentTrafficDaily = pgTable(
  "agent_traffic_daily",
  {
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
  },
  (table) => [
    index("agent_traffic_daily_user_date_idx").on(table.userId, table.date),
    index("agent_traffic_daily_store_date_idx").on(table.storeId, table.date),
  ],
);

export const listingOptimization = pgTable(
  "listing_optimization",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("productId")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    proposedTitle: text("proposedTitle"),
    proposedDescription: text("proposedDescription"),
    winRateBefore: integer("winRateBefore"),
    estimatedLift: integer("estimatedLift"),
    winRateAfter: integer("winRateAfter"),
    publishedAt: timestamp("publishedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("listing_optimization_user_product_unique").on(
      table.userId,
      table.productId,
    ),
  ],
);

export const subscription = pgTable("subscription", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripeCustomerId").notNull().unique(),
  stripeSubscriptionId: text("stripeSubscriptionId").unique(),
  stripePriceId: text("stripePriceId"),
  plan: text("plan"),
  status: text("status").notNull().default("incomplete"),
  currentPeriodStart: timestamp("currentPeriodStart", { mode: "date" }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { mode: "date" }),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  canceledAt: timestamp("canceledAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const agentApiKey = pgTable(
  "agent_api_key",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("keyHash").notNull(),
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    revokedAt: timestamp("revokedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agent_api_key_hash_unique").on(table.keyHash),
    uniqueIndex("agent_api_key_prefix_unique").on(table.prefix),
  ],
);

export const blogPost = pgTable(
  "blog_post",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("published"),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    introduction: text("introduction").notNull(),
    publishedAt: date("publishedAt").notNull(),
    readTime: text("readTime").notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    tags: jsonb("tags").$type<readonly string[]>().notNull(),
    takeaways: jsonb("takeaways").$type<readonly string[]>().notNull(),
    sections: jsonb("sections")
      .$type<
        readonly {
          number: string;
          title: string;
          content: string;
        }[]
      >()
      .notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("blog_post_slug_unique").on(table.slug)],
);

/** Tables object for defineRelations and better-auth adapter */
export const tables = {
  user,
  session,
  account,
  verification,
  store,
  store_account,
  product,
  competitor,
  scan,
  simulation,
  ucpProfile,
  agentVisit,
  agentTrafficDaily,
  listingOptimization,
  subscription,
  agentApiKey,
  blogPost,
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
    subscription: r.one.subscription({
      from: r.user.id,
      to: r.subscription.userId,
      optional: true,
    }),
    agentApiKeys: r.many.agentApiKey(),
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
    storeAccount: r.one.store_account({
      from: r.store.storeId,
      to: r.store_account.storeId,
    }),
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
    listingOptimizations: r.many.listingOptimization(),
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
  listingOptimization: {
    user: r.one.user({
      from: r.listingOptimization.userId,
      to: r.user.id,
    }),
    product: r.one.product({
      from: r.listingOptimization.productId,
      to: r.product.id,
    }),
  },
  subscription: {
    user: r.one.user({
      from: r.subscription.userId,
      to: r.user.id,
    }),
  },
  agentApiKey: {
    user: r.one.user({
      from: r.agentApiKey.userId,
      to: r.user.id,
    }),
  },
  blogPost: {},
}));
