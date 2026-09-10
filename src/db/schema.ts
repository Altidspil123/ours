import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── The couple (single row, id always 1) ────────────────────────────────────
export const couple = pgTable("couple", {
  id: serial("id").primaryKey(),
  himName: text("him_name").notNull().default("Him"),
  herName: text("her_name").notNull().default("Her"),
  anniversary: date("anniversary"), // ISO date string, nullable
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Chat ────────────────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  profile: text("profile").notNull(), // 'him' | 'her'
  text: text("text").notNull(),
  kind: text("kind").notNull().default("text"), // 'text' | 'signal'
  editedAt: timestamp("edited_at", { withTimezone: true }),
  pinnedAt: timestamp("pinned_at", { withTimezone: true }),
  pinnedBy: text("pinned_by"), // 'him' | 'her'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Chat read cursors (one row per profile) ─────────────────────────────────
export const chatReads = pgTable("chat_reads", {
  profile: text("profile").primaryKey(), // 'him' | 'her'
  lastSeenId: integer("last_seen_id").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Memories read cursors (one row per profile) ─────────────────────────────
export const memoryReads = pgTable("memory_reads", {
  profile: text("profile").primaryKey(), // 'him' | 'her'
  lastSeenId: integer("last_seen_id").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Web push subscriptions (for closed-app notifications) ──────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  profile: text("profile").notNull(), // 'him' | 'her'
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Spicy deck ──────────────────────────────────────────────────────────────
export const spicyCards = pgTable("spicy_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  // 1 = sweet, 2 = warm, 3 = hot
  intensity: integer("intensity").notNull().default(1),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const spicyDraws = pgTable("spicy_draws", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id")
    .notNull()
    .references(() => spicyCards.id, { onDelete: "cascade" }),
  drawnBy: text("drawn_by").notNull(), // 'him' | 'her'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Events + per-event checklist ────────────────────────────────────────────
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(), // 'YYYY-MM-DD'
  time: text("time"), // 'HH:MM' nullable
  notes: text("notes").notNull().default(""),
  color: text("color").notNull().default("rose"), // rose|gold|violet|aqua
  createdBy: text("created_by").notNull().default("him"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventItems = pgTable("event_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Cycle tracking ──────────────────────────────────────────────────────────
export const periodLogs = pgTable("period_logs", {
  id: serial("id").primaryKey(),
  startDate: date("start_date").notNull(), // 'YYYY-MM-DD'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// single row, id always 1
export const cycleSettings = pgTable("cycle_settings", {
  id: serial("id").primaryKey(),
  cycleLength: integer("cycle_length").notNull().default(28),
  periodLength: integer("period_length").notNull().default(5),
  autoCycle: boolean("auto_cycle").notNull().default(true), // average from logs
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Memories (photo wall for two) ───────────────────────────────────────────
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  takenOn: date("taken_on"),
  createdBy: text("created_by").notNull().default("him"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Types ───────────────────────────────────────────────────────────────────
export type Couple = typeof couple.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ChatRead = typeof chatReads.$inferSelect;
export type MemoryRead = typeof memoryReads.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type SpicyCard = typeof spicyCards.$inferSelect;
export type SpicyDraw = typeof spicyDraws.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventItem = typeof eventItems.$inferSelect;
export type PeriodLog = typeof periodLogs.$inferSelect;
export type CycleSettings = typeof cycleSettings.$inferSelect;
export type Memory = typeof memories.$inferSelect;
