ALTER TABLE "outbound_prospect" ADD COLUMN "replacement_of" text REFERENCES "outbound_prospect"("id");
--> statement-breakpoint
ALTER TABLE "outbound_prospect" ADD COLUMN "replacement_authorization" jsonb;
--> statement-breakpoint
ALTER TABLE "outbound_prospect" DROP CONSTRAINT IF EXISTS "outbound_prospect_company_id_unique";
--> statement-breakpoint
ALTER TABLE "outbound_prospect" DROP CONSTRAINT IF EXISTS "outbound_prospect_company_id_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_prospect_root_company_unique" ON "outbound_prospect" ("company_id") WHERE "replacement_of" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_prospect_replacement_unique" ON "outbound_prospect" ("replacement_of") WHERE "replacement_of" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "outbound_prospect" ADD CONSTRAINT "outbound_prospect_replacement_not_self" CHECK ("replacement_of" IS NULL OR "replacement_of" <> "id");
--> statement-breakpoint
ALTER TABLE "outbound_prospect" ADD CONSTRAINT "outbound_prospect_replacement_authorization_pair" CHECK (("replacement_of" IS NULL) = ("replacement_authorization" IS NULL));
--> statement-breakpoint
