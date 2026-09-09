import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "./types";

export const SESSION_COOKIE = "ours_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const SECRET = process.env.AUTH_SECRET ?? "pour-deux-default-secret-change-me";
const PASSCODE = process.env.APP_PASSCODE ?? "forever";

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function makeToken(profile: Profile): string {
  return `${profile}.${sign(profile)}`;
}

export function parseToken(token: string | undefined | null): Profile | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const profile = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (profile !== "him" && profile !== "her") return null;
  const expected = sign(profile);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  return profile;
}

export function verifyPasscode(code: string): boolean {
  return code.trim().toLowerCase() === PASSCODE.trim().toLowerCase();
}

/** Read the current session from cookies. Returns null when locked out. */
export async function getSession(): Promise<Profile | null> {
  const store = await cookies();
  return parseToken(store.get(SESSION_COOKIE)?.value);
}

/** Server-component guard: redirects to /unlock when there is no session. */
export async function requireSession(): Promise<Profile> {
  const profile = await getSession();
  if (!profile) redirect("/unlock");
  return profile;
}
