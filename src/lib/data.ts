import { eq, desc, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  couple,
  cycleSettings,
  eventItems,
  events,
  memories,
  messages,
  periodLogs,
  spicyCards,
  spicyDraws,
  type Couple,
  type CycleSettings,
  type Event,
  type EventItem,
  type Memory,
  type SpicyCard,
} from "@/db/schema";
import { predictCycle, type CyclePrediction } from "./cycle";
import { SEED_SPICY } from "./types";

// ─── Couple ──────────────────────────────────────────────────────────────────
export async function getCouple(): Promise<Couple> {
  await db
    .insert(couple)
    .values({ id: 1 })
    .onConflictDoNothing({ target: couple.id });
  const rows = await db.select().from(couple).where(eq(couple.id, 1)).limit(1);
  return rows[0];
}

// ─── Messages ────────────────────────────────────────────────────────────────
export async function getRecentMessages(limit = 200) {
  const rows = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.id))
    .limit(limit);
  return rows.reverse();
}

// ─── Spicy ───────────────────────────────────────────────────────────────────
export async function seedSpicyIfEmpty(): Promise<void> {
  const found = await db
    .select({ id: spicyCards.id })
    .from(spicyCards)
    .limit(1);
  if (found.length > 0) return;
  await db.insert(spicyCards).values(
    SEED_SPICY.map((c) => ({
      title: c.title,
      body: c.body,
      intensity: c.intensity,
      imageUrl: null,
    })),
  );
}

export async function getSpicyDeck(): Promise<SpicyCard[]> {
  await seedSpicyIfEmpty();
  return db.select().from(spicyCards).orderBy(asc(spicyCards.id));
}

export async function getRecentDraws(limit = 8) {
  return db
    .select({
      id: spicyDraws.id,
      drawnBy: spicyDraws.drawnBy,
      createdAt: spicyDraws.createdAt,
      cardId: spicyCards.id,
      title: spicyCards.title,
      intensity: spicyCards.intensity,
    })
    .from(spicyDraws)
    .innerJoin(spicyCards, eq(spicyDraws.cardId, spicyCards.id))
    .orderBy(desc(spicyDraws.id))
    .limit(limit);
}

// ─── Events ──────────────────────────────────────────────────────────────────
export type EventWithItems = Event & { items: EventItem[] };

export async function getEventsWithItems(): Promise<EventWithItems[]> {
  const evs = await db.select().from(events).orderBy(asc(events.date));
  if (!evs.length) return [];
  const items = await db
    .select()
    .from(eventItems)
    .orderBy(asc(eventItems.id));
  const byEvent = new Map<number, EventItem[]>();
  for (const item of items) {
    const list = byEvent.get(item.eventId) ?? [];
    list.push(item);
    byEvent.set(item.eventId, list);
  }
  return evs.map((e) => ({ ...e, items: byEvent.get(e.id) ?? [] }));
}

// ─── Cycle ───────────────────────────────────────────────────────────────────
export async function getCycleSettings(): Promise<CycleSettings> {
  await db
    .insert(cycleSettings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: cycleSettings.id });
  const rows = await db
    .select()
    .from(cycleSettings)
    .where(eq(cycleSettings.id, 1))
    .limit(1);
  return rows[0];
}

export async function getCycleData(): Promise<{
  settings: CycleSettings;
  logs: string[];
  prediction: CyclePrediction;
}> {
  const settings = await getCycleSettings();
  const rows = await db
    .select()
    .from(periodLogs)
    .orderBy(asc(periodLogs.startDate));
  const logs = rows.map((r) => r.startDate);
  const prediction = predictCycle(logs, {
    cycleLength: settings.cycleLength,
    periodLength: settings.periodLength,
    autoCycle: settings.autoCycle,
  });
  return { settings, logs, prediction };
}

// ─── Memories ────────────────────────────────────────────────────────────────
export async function getMemories(): Promise<Memory[]> {
  return db.select().from(memories).orderBy(desc(memories.id));
}

// ─── Stats for health/dashboard ──────────────────────────────────────────────
export async function unreadCount(): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(messages);
  return rows[0]?.c ?? 0;
}
