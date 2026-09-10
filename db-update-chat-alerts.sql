-- ─────────────────────────────────────────────────────────────
--  ours. — update #2: chat alerts (seen receipts + splash signal + push)
--
--  HOW TO USE (30 seconds):
--  1. Open your Neon database in the browser and click "SQL Editor".
--  2. Select this ENTIRE file, copy it, paste it in, press Run.
--  It only ADDS things — none of your existing data is touched.
-- ─────────────────────────────────────────────────────────────

-- messages get a "kind": normal text or the splash signal
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'text' NOT NULL;

-- who has seen what (one row per person)
CREATE TABLE IF NOT EXISTS "chat_reads" (
  "profile" text PRIMARY KEY NOT NULL,
  "last_seen_id" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- browser push subscriptions (so alerts arrive even when the app is closed)
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "profile" text NOT NULL,
  "endpoint" text NOT NULL UNIQUE,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
