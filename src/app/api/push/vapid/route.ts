import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { pushConfigured, vapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

/** The browser needs our public key to create a push subscription. */
export async function GET() {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  if (!pushConfigured())
    return NextResponse.json({ configured: false }, { status: 404 });

  return NextResponse.json(
    { configured: true, publicKey: vapidPublicKey() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
