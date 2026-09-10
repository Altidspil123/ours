import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { markChatRead, getChatReads } from "@/lib/data";

export async function POST(req: NextRequest) {
  const profile = await getSession();
  if (!profile)
    return NextResponse.json({ error: "locked" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    upToId?: number;
  } | null;
  const upToId = Number(body?.upToId);
  if (!Number.isFinite(upToId) || upToId < 0)
    return NextResponse.json({ error: "bad upToId" }, { status: 400 });

  await markChatRead(profile, Math.floor(upToId));
  const reads = await getChatReads();
  return NextResponse.json({ ok: true, reads });
}
