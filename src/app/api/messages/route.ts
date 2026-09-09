import { NextRequest, NextResponse } from "next/server";
import { asc, desc, gt, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number.parseInt(sinceRaw, 10) : NaN;

  if (Number.isFinite(since)) {
    const rows = await db
      .select()
      .from(messages)
      .where(gt(messages.id, since))
      .orderBy(asc(messages.id));
    return NextResponse.json({ messages: rows });
  }

  const rows = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.id))
    .limit(200);
  return NextResponse.json({ messages: rows.reverse() });
}

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = (body?.text ?? "").trim().slice(0, 2000);
  if (!text)
    return NextResponse.json({ error: "empty" }, { status: 400 });

  const [row] = await db
    .insert(messages)
    .values({ profile, text })
    .returning();
  return NextResponse.json({ message: row });
}

export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const id = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  await db
    .delete(messages)
    .where(eq(messages.id, id))
    .returning({ id: messages.id });
  return NextResponse.json({ ok: true });
}
