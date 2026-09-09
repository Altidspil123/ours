import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getEventsWithItems } from "@/lib/data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function GET() {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });
  return NextResponse.json({ events: await getEventsWithItems() });
}

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    date?: string;
    time?: string;
    notes?: string;
    color?: string;
  } | null;

  const title = (body?.title ?? "").trim().slice(0, 120);
  const date = (body?.date ?? "").trim();
  if (!title || !DATE_RE.test(date))
    return NextResponse.json({ error: "title and date required" }, { status: 400 });

  const time = body?.time && TIME_RE.test(body.time) ? body.time : null;
  const color = ["rose", "gold", "violet", "aqua"].includes(body?.color ?? "")
    ? body!.color!
    : "rose";

  const [event] = await db
    .insert(events)
    .values({
      title,
      date,
      time,
      notes: (body?.notes ?? "").trim().slice(0, 1000),
      color,
      createdBy: profile,
    })
    .returning();
  return NextResponse.json({ event });
}
