-- ─────────────────────────────────────────────────────────────────────────────
-- ours. — FACTORY RESET THE LIVE SITE, BUT KEEP EVERY CUSTOM DECK CARD
--
-- ⚠️ THIS FILE INTENTIONALLY DELETES LIVE USAGE DATA.
-- Run it only if you want the site to look never-used while preserving the
-- custom Deck cards and their pictures.
--
-- BEFORE RUNNING:
-- 1. Create a Neon backup branch named "before-big-update".
-- 2. Confirm the custom cards are visible in the spicy_cards table.
--
-- PRESERVED:
-- - every row in spicy_cards
-- - card titles, text, intensity, image_url, IDs, and creation dates
--
-- DELETED / RESET:
-- - Deck draw history (spicy_draws), but NOT the cards
-- - chat messages, pins, edits, seen receipts
-- - Memories photos and read receipts
-- - calendar events and checklist items
-- - cycle logs and cycle settings
-- - couple names and anniversary (returns to Him / Her / unset)
-- - push notification subscriptions (each phone opts in again)
--
-- This file never truncates, updates, or deletes from spicy_cards.
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE
  "spicy_draws",
  "event_items",
  "events",
  "messages",
  "chat_reads",
  "memories",
  "memory_reads",
  "period_logs",
  "cycle_settings",
  "push_subscriptions",
  "couple"
RESTART IDENTITY CASCADE;

-- A final read-only proof: this returns the cards that were preserved.
SELECT
  "id",
  "title",
  "intensity",
  "image_url"
FROM "spicy_cards"
ORDER BY "id";
