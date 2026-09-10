-- ─────────────────────────────────────────────────────────────
--  ours. — update #3: edit & pin messages + memories notifications
--
--  HOW TO USE (30 seconds):
--  1. Open your Neon database in the browser and click "SQL Editor".
--  2. Select this ENTIRE file, copy it, paste it in, press Run.
--  It only ADDS things — none of your existing data is touched.
--
--  (Run db-update-chat-alerts.sql first if you haven't already.)
-- ─────────────────────────────────────────────────────────────

-- messages can now be edited and pinned
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "edited_at" timestamp with time zone;
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "pinned_at" timestamp with time zone;
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "pinned_by" text;

-- who has seen which memories (powers the Memories notification badge)
CREATE TABLE IF NOT EXISTS "memory_reads" (
  "profile" text PRIMARY KEY NOT NULL,
  "last_seen_id" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
