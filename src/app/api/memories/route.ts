import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { getSession } from "@/lib/session";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const rows = await db.select().from(memories).orderBy(desc(memories.id));
  return NextResponse.json({ memories: rows });
}

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    imageUrl?: string;
    caption?: string;
    takenOn?: string;
  } | null;
  const imageUrl = cleanUrl(body?.imageUrl);
  if (!imageUrl)
    return NextResponse.json({ error: "image url required" }, { status: 400 });

  const [memory] = await db
    .insert(memories)
    .values({
      imageUrl,
      caption: (body?.caption ?? "").trim().slice(0, 300),
      takenOn:
        body?.takenOn && DATE_RE.test(body.takenOn) ? body.takenOn : null,
      createdBy: profile,
    })
    .returning();
  return NextResponse.json({ memory });
}

export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const id = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  await db.delete(memories).where(eq(memories.id, id));
  return NextResponse.json({ ok: true });
}
