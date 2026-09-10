-- ─────────────────────────────────────────────────────────────────────────────
-- ours. — SAFE UPDATE FOR THE EXISTING LIVE NEON DATABASE
--
-- Run this file ONCE in Neon → SQL Editor BEFORE uploading the new code.
-- It is safe to run again: every operation uses IF NOT EXISTS.
--
-- This file DOES NOT delete, replace, truncate, or update any existing data.
-- Your custom spicy cards, card pictures, memories, events, cycle history,
-- messages, names, and anniversary remain exactly as they are.
--
-- Do NOT run db-setup.sql on the existing site. That file is for a brand-new
-- empty database only.
-- ─────────────────────────────────────────────────────────────────────────────

-- Chat message types: regular message or the splash signal
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'text' NOT NULL;

-- Edited-message and pinned-message metadata
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "edited_at" timestamp with time zone;
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "pinned_at" timestamp with time zone;
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "pinned_by" text;

-- Seen receipts for chat
CREATE TABLE IF NOT EXISTS "chat_reads" (
  "profile" text PRIMARY KEY NOT NULL,
  "last_seen_id" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Unread badge for memories
CREATE TABLE IF NOT EXISTS "memory_reads" (
  "profile" text PRIMARY KEY NOT NULL,
  "last_seen_id" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Browser subscriptions for push notifications
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "profile" text NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Ensure each browser subscription is stored only once, including when the
-- table was created by an earlier version of this update.
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_unique"
  ON "push_subscriptions" ("endpoint");
