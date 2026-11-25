CREATE TABLE "loop_connections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL UNIQUE,
	"authMode" text DEFAULT 'api_key' NOT NULL,
	"apiKey" text,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"webhookSecret" text,
	"previousWebhookSecret" text,
	"previousSecretExpiresAt" timestamp,
	"callbackToken" text,
	"scopes" jsonb DEFAULT '[]' NOT NULL,
	"shopId" text,
	"webhookIds" jsonb DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'connecting' NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"connectedAt" timestamp DEFAULT now() NOT NULL,
	"disconnectedAt" timestamp,
	"purgeAfter" timestamp,
	"lastSyncedAt" timestamp,
	"lastMaintenanceAt" timestamp,
	"lastError" text,
	"cleanupRequired" boolean DEFAULT false NOT NULL,
	"lease" text,
	"leaseUntil" timestamp,
	"nextRequestAt" timestamp,
	"nextAuthRequestAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_installations" (
	"id" text PRIMARY KEY,
	"storeId" text NOT NULL,
	"userId" text NOT NULL,
	"organization" text NOT NULL,
	"verifier" text NOT NULL,
	"stateHash" text NOT NULL,
	"generation" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"availableAt" timestamp DEFAULT now() NOT NULL,
	"lease" text,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_measurements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"proposalId" text,
	"productId" text NOT NULL,
	"publishedAt" timestamp NOT NULL,
	"windowDays" integer DEFAULT 60 NOT NULL,
	"baseline" jsonb DEFAULT '{}' NOT NULL,
	"controlProductIds" jsonb DEFAULT '[]' NOT NULL,
	"snapshot" jsonb DEFAULT '{}' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_proposals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"productId" text NOT NULL,
	"gapId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'loop' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"original" jsonb DEFAULT '{}' NOT NULL,
	"proposed" jsonb DEFAULT '{}' NOT NULL,
	"diff" jsonb DEFAULT '{}' NOT NULL,
	"evidence" jsonb DEFAULT '{}' NOT NULL,
	"requiresMerchantApproval" boolean DEFAULT true NOT NULL,
	"approvedAt" timestamp,
	"publishedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_reason_mappings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"reason" text NOT NULL,
	"parentReason" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"dataFixable" boolean NOT NULL,
	"source" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_return_lines" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"loopReturnId" text NOT NULL,
	"lineItemId" text NOT NULL,
	"providerLineItemId" text,
	"providerOrderId" text,
	"orderName" text,
	"productId" text,
	"externalProductId" text,
	"variantId" text,
	"sku" text,
	"title" text,
	"price" numeric(18,4),
	"quantity" integer DEFAULT 1 NOT NULL,
	"refund" text,
	"currency" text,
	"returnReason" text NOT NULL,
	"parentReturnReason" text,
	"redactedComment" text,
	"outcome" text,
	"lineOutcome" text,
	"exchangeVariant" text,
	"returnState" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"returnedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "loop_return_versions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"loopReturnId" text NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_signal_checks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"gapId" text NOT NULL,
	"productId" text NOT NULL,
	"surface" text NOT NULL,
	"prompt" text NOT NULL,
	"expected" jsonb DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"observed" jsonb,
	"evidence" text,
	"error" text,
	"requestKey" text NOT NULL,
	"checkedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_expectation_gaps" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"productId" text NOT NULL,
	"variantId" text,
	"attribute" text NOT NULL,
	"direction" text,
	"count" integer NOT NULL,
	"share" double precision NOT NULL,
	"refundValue" numeric(18,4),
	"currency" text,
	"windowStart" timestamp NOT NULL,
	"windowEnd" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"checkRunId" text,
	"optimizationId" text,
	"evidence" jsonb DEFAULT '{}' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "loop_connection_shop" ON "loop_connections" ("storeId","shopId");--> statement-breakpoint
CREATE INDEX "loop_installation_store" ON "loop_installations" ("storeId");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_job_identity" ON "loop_jobs" ("storeId","key");--> statement-breakpoint
CREATE INDEX "loop_job_due" ON "loop_jobs" ("storeId","status","availableAt");--> statement-breakpoint
CREATE INDEX "loop_measurement_product" ON "loop_measurements" ("storeId","productId");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_proposal_identity" ON "loop_proposals" ("storeId","gapId","revision");--> statement-breakpoint
CREATE INDEX "loop_proposal_product" ON "loop_proposals" ("storeId","productId");--> statement-breakpoint
CREATE INDEX "loop_proposal_gap" ON "loop_proposals" ("storeId","gapId");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_reason_identity" ON "loop_reason_mappings" ("storeId","reason","parentReason");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_line_identity" ON "loop_return_lines" ("storeId","lineItemId");--> statement-breakpoint
CREATE INDEX "loop_line_return" ON "loop_return_lines" ("storeId","loopReturnId");--> statement-breakpoint
CREATE INDEX "loop_line_order" ON "loop_return_lines" ("storeId","providerOrderId");--> statement-breakpoint
CREATE INDEX "loop_line_product" ON "loop_return_lines" ("storeId","productId","createdAt");--> statement-breakpoint
CREATE INDEX "loop_line_external_product" ON "loop_return_lines" ("storeId","externalProductId");--> statement-breakpoint
CREATE INDEX "loop_line_variant" ON "loop_return_lines" ("storeId","variantId");--> statement-breakpoint
CREATE INDEX "loop_line_provider_line" ON "loop_return_lines" ("storeId","providerLineItemId");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_return_version_identity" ON "loop_return_versions" ("storeId","loopReturnId");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_check_identity" ON "loop_signal_checks" ("storeId","requestKey");--> statement-breakpoint
CREATE INDEX "loop_check_gap" ON "loop_signal_checks" ("storeId","gapId");--> statement-breakpoint
CREATE UNIQUE INDEX "loop_gap_identity" ON "return_expectation_gaps" ("storeId","productId","attribute");--> statement-breakpoint
CREATE INDEX "loop_gap_product" ON "return_expectation_gaps" ("storeId","productId");--> statement-breakpoint
CREATE INDEX "loop_gap_status" ON "return_expectation_gaps" ("storeId","status");--> statement-breakpoint
ALTER TABLE "loop_connections" ADD CONSTRAINT "loop_connections_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_installations" ADD CONSTRAINT "loop_installations_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_installations" ADD CONSTRAINT "loop_installations_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_jobs" ADD CONSTRAINT "loop_jobs_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_measurements" ADD CONSTRAINT "loop_measurements_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_measurements" ADD CONSTRAINT "loop_measurements_proposalId_loop_proposals_id_fkey" FOREIGN KEY ("proposalId") REFERENCES "loop_proposals"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "loop_measurements" ADD CONSTRAINT "loop_measurements_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_proposals" ADD CONSTRAINT "loop_proposals_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_proposals" ADD CONSTRAINT "loop_proposals_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_proposals" ADD CONSTRAINT "loop_proposals_gapId_return_expectation_gaps_id_fkey" FOREIGN KEY ("gapId") REFERENCES "return_expectation_gaps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_reason_mappings" ADD CONSTRAINT "loop_reason_mappings_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_return_lines" ADD CONSTRAINT "loop_return_lines_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_return_lines" ADD CONSTRAINT "loop_return_lines_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "loop_return_versions" ADD CONSTRAINT "loop_return_versions_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_signal_checks" ADD CONSTRAINT "loop_signal_checks_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_signal_checks" ADD CONSTRAINT "loop_signal_checks_gapId_return_expectation_gaps_id_fkey" FOREIGN KEY ("gapId") REFERENCES "return_expectation_gaps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "loop_signal_checks" ADD CONSTRAINT "loop_signal_checks_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "return_expectation_gaps" ADD CONSTRAINT "return_expectation_gaps_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "return_expectation_gaps" ADD CONSTRAINT "return_expectation_gaps_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;