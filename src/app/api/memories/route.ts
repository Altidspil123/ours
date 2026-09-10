import { NextRequest, NextResponse, after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getCouple } from "@/lib/data";
import { sendPushToProfile } from "@/lib/push";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Photos uploaded from a phone arrive as compressed data: URLs; links from
// the web arrive as normal http(s) urls. Both are fine.
const MAX_UPLOAD_CHARS = 4_500_000; // ~3.3 MB of image after base64

function cleanUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const t = u.trim();
  if (!t) return null;
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(t)) {
    return t.length <= MAX_UPLOAD_CHARS ? t : null;
  }
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

  // Let the other one know a new memory landed on the wall.
  const partner = profile === "him" ? "her" : "him";
  after(async () => {
    try {
      const couple = await getCouple();
      const senderName = profile === "him" ? couple.himName : couple.herName;
      await sendPushToProfile(partner, {
        title: `${senderName} pinned a new memory`,
        body: memory.caption
          ? `“${memory.caption.slice(0, 120)}”`
          : "Something they never want to forget. Tap to see it.",
        url: "/memories",
        kind: "text",
        tag: "ours-memory",
      });
    } catch {
      /* push is best-effort */
    }
  });

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
