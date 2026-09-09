import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { spicyCards, spicyDraws } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    cardId?: number;
  } | null;
  const cardId = Number(body?.cardId);
  if (!Number.isFinite(cardId))
    return NextResponse.json({ error: "bad card" }, { status: 400 });

  const exists = await db
    .select({ id: spicyCards.id })
    .from(spicyCards)
    .where(eq(spicyCards.id, cardId))
    .limit(1);
  if (!exists.length)
    return NextResponse.json({ error: "card not found" }, { status: 404 });

  const [draw] = await db
    .insert(spicyDraws)
    .values({ cardId, drawnBy: profile })
    .returning();
  return NextResponse.json({ draw });
}
