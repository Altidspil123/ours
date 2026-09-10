import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getLatestMemoryId, markMemoriesRead } from "@/lib/data";

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    upToId?: number;
  } | null;

  // No id given → mark everything currently on the wall as seen.
  const upToId = Number.isFinite(Number(body?.upToId))
    ? Math.floor(Number(body?.upToId))
    : await getLatestMemoryId();

  await markMemoriesRead(profile, upToId);
  return NextResponse.json({ ok: true, upToId });
}
