import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventItems } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    eventId?: number;
    text?: string;
  } | null;
  const eventId = Number(body?.eventId);
  const text = (body?.text ?? "").trim().slice(0, 200);
  if (!Number.isFinite(eventId) || !text)
    return NextResponse.json({ error: "event and text required" }, { status: 400 });

  const [item] = await db
    .insert(eventItems)
    .values({ eventId, text })
    .returning();
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    id?: number;
    done?: boolean;
    text?: string;
  } | null;
  const id = Number(body?.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  const patch: Partial<typeof eventItems.$inferInsert> = {};
  if (typeof body?.done === "boolean") patch.done = body.done;
  if (typeof body?.text === "string" && body.text.trim())
    patch.text = body.text.trim().slice(0, 200);

  const [item] = await db
    .update(eventItems)
    .set(patch)
    .where(eq(eventItems.id, id))
    .returning();
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const id = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  await db.delete(eventItems).where(eq(eventItems.id, id));
  return NextResponse.json({ ok: true });
}
