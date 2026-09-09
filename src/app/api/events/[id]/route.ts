import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSession } from "@/lib/session";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const { id: raw } = await params;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    date?: string;
    time?: string | null;
    notes?: string;
    color?: string;
  } | null;

  const patch: Partial<typeof events.$inferInsert> = {};
  if (typeof body?.title === "string" && body.title.trim())
    patch.title = body.title.trim().slice(0, 120);
  if (typeof body?.date === "string" && DATE_RE.test(body.date))
    patch.date = body.date;
  if (body?.time !== undefined)
    patch.time = typeof body.time === "string" && TIME_RE.test(body.time) ? body.time : null;
  if (typeof body?.notes === "string") patch.notes = body.notes.trim().slice(0, 1000);
  if (typeof body?.color === "string" && ["rose", "gold", "violet", "aqua"].includes(body.color))
    patch.color = body.color;

  const [event] = await db
    .update(events)
    .set(patch)
    .where(eq(events.id, id))
    .returning();
  return NextResponse.json({ event });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const { id: raw } = await params;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
}
