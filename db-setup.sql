-- ─────────────────────────────────────────────────────────────
--  ours. — database setup, the paste-and-run edition
--
--  ⚠️  FIRST-TIME SETUP ONLY.
--  If your app is already live and has your cards, photos and messages in
--  it, you do NOT need this file — skip to the db-update-*.sql files.
--  (Running this on a live database is harmless — every CREATE TABLE will
--  simply error with "already exists" and nothing is deleted — but there's
--  no reason to run it.)
--
--  HOW TO USE THIS FILE (30 seconds):
--  1. Open your Neon database in the browser (via Vercel → Storage,
--     or neon.tech console) and click "SQL Editor" in the left menu.
--  2. Select the ENTIRE contents of this file, copy it.
--  3. Paste it into the SQL Editor and press Run.
--  That's it — all tables now exist.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "couple" (
	"id" serial PRIMARY KEY NOT NULL,
	"him_name" text DEFAULT 'Him' NOT NULL,
	"her_name" text DEFAULT 'Her' NOT NULL,
	"anniversary" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "cycle_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_length" integer DEFAULT 28 NOT NULL,
	"period_length" integer DEFAULT 5 NOT NULL,
	"auto_cycle" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"notes" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'rose' NOT NULL,
	"created_by" text DEFAULT 'him' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "event_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"taken_on" date,
	"created_by" text DEFAULT 'him' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile" text NOT NULL,
	"text" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"edited_at" timestamp with time zone,
	"pinned_at" timestamp with time zone,
	"pinned_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "chat_reads" (
	"profile" text PRIMARY KEY NOT NULL,
	"last_seen_id" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "memory_reads" (
	"profile" text PRIMARY KEY NOT NULL,
	"last_seen_id" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile" text NOT NULL,
	"endpoint" text NOT NULL UNIQUE,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "period_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "spicy_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"intensity" integer DEFAULT 1 NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "spicy_draws" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"drawn_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "event_items"
	ADD CONSTRAINT "event_items_event_id_events_id_fk"
	FOREIGN KEY ("event_id") REFERENCES "public"."events"("id")
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE "spicy_draws"
	ADD CONSTRAINT "spicy_draws_card_id_spicy_cards_id_fk"
	FOREIGN KEY ("card_id") REFERENCES "public"."spicy_cards"("id")
	ON DELETE cascade ON UPDATE no action;
