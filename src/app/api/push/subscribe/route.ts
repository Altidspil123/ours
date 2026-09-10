import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { pushConfigured } from "@/lib/push";

interface SubBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });
  if (!pushConfigured())
    return NextResponse.json(
      { error: "push-not-configured" },
      { status: 503 },
    );

  const body = (await req.json().catch(() => null)) as {
    subscription?: SubBody;
  } | null;
  const sub = body?.subscription;
  const endpoint = sub?.endpoint?.trim();
  const p256dh = sub?.keys?.p256dh?.trim();
  const auth = sub?.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth)
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });

  await db
    .insert(pushSubscriptions)
    .values({ profile, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { profile, p256dh, auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    endpoint?: string;
  } | null;
  const endpoint = body?.endpoint?.trim();
  if (!endpoint)
    return NextResponse.json({ error: "bad endpoint" }, { status: 400 });

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return NextResponse.json({ ok: true });
}
