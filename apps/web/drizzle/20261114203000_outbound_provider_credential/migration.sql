CREATE TABLE IF NOT EXISTS "outbound_provider_credential" (
  "provider" text PRIMARY KEY NOT NULL,
  "api_key" text NOT NULL,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "validated_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
