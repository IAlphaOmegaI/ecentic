ALTER TABLE "store_account" ADD COLUMN "bridgeSecret" text;--> statement-breakpoint
CREATE TABLE "ucp_order" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"storeId" text NOT NULL,
	"externalOrderId" text NOT NULL,
	"checkoutId" text NOT NULL,
	"webhookUrl" text,
	"agentProfileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ucp_order" ADD CONSTRAINT "ucp_order_storeId_store_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ucp_order_store_external_unique" ON "ucp_order" USING btree ("storeId","externalOrderId");--> statement-breakpoint
CREATE INDEX "ucp_order_checkout_idx" ON "ucp_order" USING btree ("checkoutId");
