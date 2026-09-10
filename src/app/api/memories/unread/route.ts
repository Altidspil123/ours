import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUnreadMemoriesFor } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const unread = await getUnreadMemoriesFor(profile);
  return NextResponse.json(unread, {
    headers: { "Cache-Control": "no-store" },
  });
}
