import { and, eq, desc, asc, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chatReads,
  couple,
  cycleSettings,
  eventItems,
  events,
  memories,
  memoryReads,
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
import { SEED_SPICY, type Profile } from "./types";

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

// ─── Chat read receipts ("seen") ─────────────────────────────────────────────
export interface ChatReads {
  himLastSeenId: number;
  herLastSeenId: number;
  himSeenAt: string | null;
  herSeenAt: string | null;
}

export async function getChatReads(): Promise<ChatReads> {
  const rows = await db.select().from(chatReads);
  const him = rows.find((r) => r.profile === "him");
  const her = rows.find((r) => r.profile === "her");
  return {
    himLastSeenId: him?.lastSeenId ?? 0,
    herLastSeenId: her?.lastSeenId ?? 0,
    himSeenAt: him ? him.updatedAt.toISOString() : null,
    herSeenAt: her ? her.updatedAt.toISOString() : null,
  };
}

/** Advance a profile's read cursor (never backwards). */
export async function markChatRead(profile: Profile, upToId: number) {
  await db
    .insert(chatReads)
    .values({ profile, lastSeenId: upToId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: chatReads.profile,
      set: {
        lastSeenId: sql`GREATEST(${chatReads.lastSeenId}, ${upToId})`,
        updatedAt: new Date(),
      },
    });
}

// ─── Memories read receipts ──────────────────────────────────────────────────
export async function markMemoriesRead(profile: Profile, upToId: number) {
  await db
    .insert(memoryReads)
    .values({ profile, lastSeenId: upToId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: memoryReads.profile,
      set: {
        lastSeenId: sql`GREATEST(${memoryReads.lastSeenId}, ${upToId})`,
        updatedAt: new Date(),
      },
    });
}

/** Memories added by the partner that this profile hasn't seen yet. */
export async function getUnreadMemoriesFor(profile: Profile) {
  const rows = await db
    .select()
    .from(memoryReads)
    .where(eq(memoryReads.profile, profile))
    .limit(1);
  const cursor = rows[0]?.lastSeenId ?? 0;
  const partner: Profile = profile === "him" ? "her" : "him";
  const fresh = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.createdBy, partner), gt(memories.id, cursor)))
    .orderBy(desc(memories.id));
  return {
    count: fresh.length,
    latestId: fresh[0]?.id ?? null,
  };
}

/** Newest memory id overall — used to set the cursor when the wall opens. */
export async function getLatestMemoryId(): Promise<number> {
  const rows = await db
    .select({ id: memories.id })
    .from(memories)
    .orderBy(desc(memories.id))
    .limit(1);
  return rows[0]?.id ?? 0;
}

/** Unread incoming messages for one profile (sent by the partner). */
export async function getUnreadFor(profile: Profile) {
  const reads = await getChatReads();
  const cursor = profile === "him" ? reads.himLastSeenId : reads.herLastSeenId;
  const partner: Profile = profile === "him" ? "her" : "him";
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.profile, partner), gt(messages.id, cursor)))
    .orderBy(desc(messages.id));
  const latest = rows[0] ?? null;
  return {
    count: rows.length,
    latestId: latest?.id ?? null,
    latestKind: (latest?.kind ?? "text") as "text" | "signal",
    latestAt: latest ? latest.createdAt.toISOString() : null,
  };
}
