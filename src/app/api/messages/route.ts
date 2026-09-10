import { NextRequest, NextResponse, after } from "next/server";
import { asc, desc, gt, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getChatReads, getCouple } from "@/lib/data";
import { sendPushToProfile } from "@/lib/push";

export async function GET(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number.parseInt(sinceRaw, 10) : NaN;
  const reads = await getChatReads();

  if (Number.isFinite(since)) {
    const rows = await db
      .select()
      .from(messages)
      .where(gt(messages.id, since))
      .orderBy(asc(messages.id));
    return NextResponse.json({ messages: rows, reads });
  }

  const rows = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.id))
    .limit(200);
  return NextResponse.json({ messages: rows.reverse(), reads });
}

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    text?: string;
    kind?: string;
  } | null;

  const kind = body?.kind === "signal" ? "signal" : "text";
  const text = (body?.text ?? "").trim().slice(0, 2000);
  if (kind === "text" && !text)
    return NextResponse.json({ error: "empty" }, { status: 400 });

  // A signal's text always stays empty — it speaks for itself.
  const [row] = await db
    .insert(messages)
    .values({ profile, text: kind === "signal" ? "" : text, kind })
    .returning();

  // Notify the partner even when their app is closed (best-effort,
  // runs after the response so sending never feels slow).
  const partner = profile === "him" ? "her" : "him";
  after(async () => {
    try {
      const couple = await getCouple();
      const senderName = profile === "him" ? couple.himName : couple.herName;
      await sendPushToProfile(partner, {
        title:
          kind === "signal"
            ? `${senderName} sent you a signal`
            : `${senderName} whispered`,
        body:
          kind === "signal"
            ? "The splash signal — come find them. Tap to answer."
            : text.length > 140
              ? `${text.slice(0, 140)}…`
              : text,
        url: "/chat",
        kind,
        tag: `ours-${kind}`,
      });
    } catch {
      /* push is best-effort */
    }
  });

  return NextResponse.json({ message: row });
}

export async function PATCH(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    id?: number;
    text?: string;
    pinned?: boolean;
  } | null;

  const id = Number(body?.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  // ── pin / unpin (either of you may pin anything) ──
  if (typeof body?.pinned === "boolean") {
    const [row] = await db
      .update(messages)
      .set(
        body.pinned
          ? { pinnedAt: new Date(), pinnedBy: profile }
          : { pinnedAt: null, pinnedBy: null },
      )
      .where(eq(messages.id, id))
      .returning();
    return NextResponse.json({ message: row });
  }

  // ── edit text (only your own, and never a signal) ──
  if (typeof body?.text === "string") {
    if (existing.profile !== profile)
      return NextResponse.json({ error: "not yours" }, { status: 403 });
    if (existing.kind === "signal")
      return NextResponse.json({ error: "cannot edit a signal" }, { status: 400 });

    const text = body.text.trim().slice(0, 2000);
    if (!text)
      return NextResponse.json({ error: "empty" }, { status: 400 });

    const [row] = await db
      .update(messages)
      .set({ text, editedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return NextResponse.json({ message: row });
  }

  return NextResponse.json({ error: "nothing to do" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const id = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });

  // You may only delete your own messages.
  const [existing] = await db
    .select({ profile: messages.profile })
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);
  if (existing && existing.profile !== profile)
    return NextResponse.json({ error: "not yours" }, { status: 403 });

  await db
    .delete(messages)
    .where(eq(messages.id, id))
    .returning({ id: messages.id });
  return NextResponse.json({ ok: true });
}
