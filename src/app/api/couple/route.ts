import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { couple } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getCouple } from "@/lib/data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });
  return NextResponse.json({ couple: await getCouple() });
}

export async function PATCH(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    himName?: string;
    herName?: string;
    anniversary?: string | null;
  } | null;

  const patch: Partial<typeof couple.$inferInsert> = { updatedAt: new Date() };
  if (typeof body?.himName === "string" && body.himName.trim())
    patch.himName = body.himName.trim().slice(0, 40);
  if (typeof body?.herName === "string" && body.herName.trim())
    patch.herName = body.herName.trim().slice(0, 40);
  if (body !== null && body !== undefined && "anniversary" in body) {
    patch.anniversary =
      typeof body.anniversary === "string" && DATE_RE.test(body.anniversary)
        ? body.anniversary
        : null;
  }

  await db.update(couple).set(patch).where(eq(couple.id, 1));
  return NextResponse.json({ couple: await getCouple() });
}
