import { NextRequest, NextResponse } from "next/server";
import { desc, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { spicyCards, spicyDraws } from "@/db/schema";
import { getSession } from "@/lib/session";
import { seedSpicyIfEmpty } from "@/lib/data";

function clampIntensity(n: unknown, fallback = 1) {
  const v = typeof n === "number" ? Math.round(n) : Number.parseInt(String(n), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(3, Math.max(1, v));
}

function cleanUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const t = u.trim();
  if (!t) return null;
  if (/^(https?:)?\/\//i.test(t) || t.startsWith("/")) return t;
  return null;
}

export async function GET() {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  await seedSpicyIfEmpty();
  const cards = await db
    .select()
    .from(spicyCards)
    .orderBy(asc(spicyCards.id));
  const draws = await db
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
    .limit(8);

  return NextResponse.json({ cards, draws });
}

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    body?: string;
    intensity?: number;
    imageUrl?: string;
  } | null;

  const title = (body?.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const [card] = await db
    .insert(spicyCards)
    .values({
      title,
      body: (body?.body ?? "").trim().slice(0, 600),
      intensity: clampIntensity(body?.intensity, 1),
      imageUrl: cleanUrl(body?.imageUrl),
    })
    .returning();
  return NextResponse.json({ card });
}

export async function PATCH(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const id = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    body?: string;
    intensity?: number;
    imageUrl?: string | null;
  } | null;

  const patch: Partial<typeof spicyCards.$inferInsert> = {};
  if (typeof body?.title === "string" && body.title.trim())
    patch.title = body.title.trim().slice(0, 120);
  if (typeof body?.body === "string") patch.body = body.body.trim().slice(0, 600);
  if (body?.intensity !== undefined)
    patch.intensity = clampIntensity(body.intensity, 1);
  if (body !== null && body !== undefined && "imageUrl" in body)
    patch.imageUrl = body.imageUrl === null ? null : cleanUrl(body.imageUrl);

  const [card] = await db
    .update(spicyCards)
    .set(patch)
    .where(eq(spicyCards.id, id))
    .returning();
  return NextResponse.json({ card });
}

export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const id = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  await db.delete(spicyCards).where(eq(spicyCards.id, id));
  return NextResponse.json({ ok: true });
}
