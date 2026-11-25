-- Adopt the table used by existing /agents deployments without replacing its
-- rows or converting its JSON-as-text values. Fresh environments create it here.
CREATE TABLE IF NOT EXISTS "agents_state" (
  "key" text PRIMARY KEY,
  "value" text NOT NULL,
  "expires_at" timestamptz
);
