import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import type { Profile } from "./types";

// ─── Web Push (optional layer) ─────────────────────────────────────────────
// Works only when these two env vars are set (see .env.example):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// When missing, the app silently falls back to in-app + visible-tab alerts.

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";

let initialised = false;
function ensureInit(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  if (!initialised) {
    webpush.setVapidDetails(
      "mailto:hello@ours.local",
      VAPID_PUBLIC,
      VAPID_PRIVATE,
    );
    initialised = true;
  }
  return true;
}

export const pushConfigured = (): boolean =>
  Boolean(VAPID_PUBLIC && VAPID_PRIVATE);

export const vapidPublicKey = (): string => VAPID_PUBLIC;

export interface ChatPushPayload {
  title: string;
  body: string;
  url: string;
  kind: "text" | "signal";
  tag: string;
}

/** Send a push notification to every browser/device of one profile. */
export async function sendPushToProfile(
  to: Profile,
  payload: ChatPushPayload,
): Promise<void> {
  if (!ensureInit()) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.profile, to));

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 10, urgency: "high" },
        );
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        // 404/410 = the browser says this subscription is gone — prune it.
        if (status === 404 || status === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id))
            .catch(() => undefined);
        }
      }
    }),
  );
}
