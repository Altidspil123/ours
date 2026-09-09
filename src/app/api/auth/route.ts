import { NextRequest, NextResponse } from "next/server";
import {
  makeToken,
  verifyPasscode,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    profile?: string;
    passcode?: string;
  } | null;

  const profile =
    body?.profile === "him" ? "him" : body?.profile === "her" ? "her" : null;
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!profile || !passcode.trim()) {
    return NextResponse.json(
      { error: "Pick who you are and whisper the code." },
      { status: 400 },
    );
  }
  if (!verifyPasscode(passcode)) {
    return NextResponse.json(
      { error: "Wrong code, love. Try again." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeToken(profile), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
