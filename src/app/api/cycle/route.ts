import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { cycleSettings, periodLogs } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getCycleData, getCycleSettings } from "@/lib/data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });
  return NextResponse.json(await getCycleData());
}

// Log a new period start date.
export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    startDate?: string;
  } | null;
  const startDate = (body?.startDate ?? "").trim();
  if (!DATE_RE.test(startDate))
    return NextResponse.json({ error: "date required" }, { status: 400 });

  const [log] = await db
    .insert(periodLogs)
    .values({ startDate })
    .returning();
  return NextResponse.json({ log });
}

// Delete a logged period start (by its start date).
export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const date = (req.nextUrl.searchParams.get("date") ?? "").trim();
  if (!DATE_RE.test(date))
    return NextResponse.json({ error: "bad date" }, { status: 400 });

  await db.delete(periodLogs).where(eq(periodLogs.startDate, date));
  return NextResponse.json({ ok: true });
}

// Update cycle settings (manual length / averaging toggle / period length).
export async function PATCH(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    cycleLength?: number;
    periodLength?: number;
    autoCycle?: boolean;
  } | null;

  const patch: Partial<typeof cycleSettings.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof body?.cycleLength === "number" && Number.isFinite(body.cycleLength))
    patch.cycleLength = Math.min(60, Math.max(18, Math.round(body.cycleLength)));
  if (typeof body?.periodLength === "number" && Number.isFinite(body.periodLength))
    patch.periodLength = Math.min(10, Math.max(2, Math.round(body.periodLength)));
  if (typeof body?.autoCycle === "boolean") patch.autoCycle = body.autoCycle;

  await db.update(cycleSettings).set(patch).where(eq(cycleSettings.id, 1));

  // Return last logs too so client can refresh everything.
  const logs = await db
    .select()
    .from(periodLogs)
    .orderBy(desc(periodLogs.startDate))
    .limit(12);
  const settings = await getCycleSettings();
  return NextResponse.json({ settings, logs });
}
