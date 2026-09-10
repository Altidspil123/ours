"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  Droplets,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  X,
  HeartHandshake,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { playMessageChime, playSignalChime } from "@/lib/sound";

interface Msg {
  id: number;
  profile: string;
  text: string;
  kind: "text" | "signal";
  createdAt: string;
  editedAt?: string | null;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  pending?: boolean;
}

interface Reads {
  himLastSeenId: number;
  herLastSeenId: number;
  himSeenAt: string | null;
  herSeenAt: string | null;
}

type NotifState =
  | "loading"
  | "unsupported"
  | "off"
  | "blocked"
  | "local"
  | "push";

const BASE_TITLE = "ours · just us two";
const PING_KEY = "ours_last_ping";

const dayKey = (isoStr: string) => isoStr.slice(0, 10);

function dayLabel(isoStr: string): string {
  const d = new Date(isoStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = dayKey(isoStr);
  if (key === today.toISOString().slice(0, 10)) return "Today";
  if (key === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

const fmtTime = (isoStr: string) =>
  new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Stamp that this tab already sounded for a message (stops double chimes). */
function stampPing(id: number) {
  try {
    localStorage.setItem(PING_KEY, JSON.stringify({ id, t: Date.now() }));
  } catch {
    /* private mode etc. */
  }
}

export function ChatRoom({
  profile,
  meName,
  partnerName,
  initial,
  initialReads,
}: {
  profile: Profile;
  meName: string;
  partnerName: string;
  initial: Msg[];
  initialReads: Reads;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerSeenId, setPartnerSeenId] = useState(
    profile === "him" ? initialReads.herLastSeenId : initialReads.himLastSeenId,
  );
  const [partnerSeenAt, setPartnerSeenAt] = useState<string | null>(
    profile === "him" ? initialReads.herSeenAt : initialReads.himSeenAt,
  );
  const [banner, setBanner] = useState<{
    key: number;
    kind: "text" | "signal";
  } | null>(null);
  const [signalFlash, setSignalFlash] = useState(false);
  const [notif, setNotif] = useState<NotifState>("loading");
  const [cooldown, setCooldown] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [missed, setMissed] = useState(0);
  const [activePin, setActivePin] = useState(0);
  const [editing, setEditing] = useState<{ id: number } | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [sheet, setSheet] = useState<Msg | null>(null);

  const lastIdRef = useRef(initial.length ? initial[initial.length - 1].id : 0);
  const myCursorRef = useRef(
    Math.max(
      profile === "him" ? initialReads.himLastSeenId : initialReads.herLastSeenId,
      lastIdRef.current,
    ),
  );
  const notifRef = useRef<NotifState>("loading");
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedRef = useRef<Msg[]>([]);
  const pinLockRef = useRef(0);

  notifRef.current = notif;

  /** Scroll the window all the way down, so the newest message clears the
      composer (scrollIntoView on the sentinel stops ~250px short). */
  const scrollToBottom = useCallback((smooth = true) => {
    const go = () =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    go();
    // Run again next frame in case images/layout shifted the height.
    requestAnimationFrame(go);
  }, []);

  // ─── Seen cursors ────────────────────────────────────────────────────────
  const markSeen = useCallback(
    (upToId: number) => {
      if (upToId <= myCursorRef.current) return;
      myCursorRef.current = upToId;
      fetch("/api/chat/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upToId }),
      }).catch(() => {
        myCursorRef.current = Math.min(myCursorRef.current, upToId - 1);
      });
    },
    [],
  );

  const showBanner = useCallback((kind: "text" | "signal") => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ key: Date.now(), kind });
    bannerTimer.current = setTimeout(() => setBanner(null), 4500);
  }, []);

  const announce = useCallback(
    (kind: "text" | "signal", msgId: number, preview: string) => {
      stampPing(msgId);
      if (document.visibilityState === "visible") {
        if (kind === "signal") {
          playSignalChime();
          setSignalFlash(true);
          setTimeout(() => setSignalFlash(false), 1400);
        } else {
          playMessageChime();
        }
        showBanner(kind);
      } else {
        // Tab hidden → flash the title; OS notification as fallback when
        // web push isn't active (when it is, the service worker notifies).
        document.title = kind === "signal" ? "(signal) ours." : "(1) ours.";
        if (
          notifRef.current === "local" &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            const n = new Notification(
              kind === "signal"
                ? `${partnerName} sent you a signal`
                : `${partnerName} whispered`,
              {
                body: kind === "signal" ? "The splash signal — come find them." : preview,
                tag: `ours-${kind}`,
                icon: "/icon.png",
              },
            );
            n.onclick = () => {
              window.focus();
              n.close();
            };
          } catch {
            /* some mobile browsers throw — title flash still works */
          }
        }
      }
    },
    [partnerName, showBanner],
  );

  // Restore the tab title once we're back.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        document.title = BASE_TITLE;
        markSeen(lastIdRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [markSeen]);

  // ─── Polling ─────────────────────────────────────────────────────────────
  const fetchFresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?since=${lastIdRef.current}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Msg[]; reads: Reads };
      const partnerCursor =
        profile === "him" ? data.reads.herLastSeenId : data.reads.himLastSeenId;
      const partnerAt =
        profile === "him" ? data.reads.herSeenAt : data.reads.himSeenAt;
      setPartnerSeenId((prev) => Math.max(prev, partnerCursor));
      if (partnerAt) setPartnerSeenAt(partnerAt);

      const fresh = data.messages.filter((m) => m.id > lastIdRef.current);
      if (!fresh.length) return;
      lastIdRef.current = Math.max(...fresh.map((m) => m.id));

      const incoming = fresh.filter((m) => m.profile !== profile);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...prev, ...fresh.filter((m) => !known.has(m.id))];
      });

      // Alert for each new partner message (usually just one).
      const last = incoming[incoming.length - 1];
      if (last) announce(last.kind, last.id, last.text);

      // Reading older messages? Count what arrived below us.
      if (incoming.length && !nearBottomRef.current) {
        setMissed((m) => m + incoming.length);
      }

      // We're looking at the chat (or will be when we return) → mark seen.
      if (document.visibilityState === "visible") markSeen(lastIdRef.current);

      if (nearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    } catch {
      /* offline — try again next tick */
    }
  }, [announce, markSeen, profile, scrollToBottom]);

  useEffect(() => {
    const t = setInterval(fetchFresh, 3000);
    return () => clearInterval(t);
  }, [fetchFresh]);

  // Instant refresh when the service worker forwards a push while visible.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "ours:push") void fetchFresh();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [fetchFresh]);

  // Track scroll proximity to bottom for smart auto-scroll + jump button.
  useEffect(() => {
    const onScroll = () => {
      const fromBottom =
        document.documentElement.scrollHeight -
        (window.innerHeight + window.scrollY);
      nearBottomRef.current = fromBottom <= 180;
      const scrolledUp = fromBottom > 320;
      setShowJump(scrolledUp);
      if (!scrolledUp) setMissed(0);

      // Which pinned message is "in effect" where we're reading right now?
      // (list is newest-first; pick the newest one at or above the view)
      const list = pinnedRef.current;
      if (list.length && Date.now() > pinLockRef.current) {
        // A pin counts as "reached" once it has scrolled into view from
        // below (above the composer line), so the bar shows the newest
        // pin you've actually got to.
        const anchor = window.innerHeight - 200;
        let idx = list.length - 1; // above every pin → show the oldest
        for (let i = 0; i < list.length; i += 1) {
          const el = document.getElementById(`msg-${list[i].id}`);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= anchor) {
            idx = i;
            break;
          }
        }
        setActivePin(idx);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /** The bar always shows the pin you'll be taken to next. Tap → fly there,
      then the bar previews the following one (wraps around, like Telegram). */
  const jumpToPin = useCallback(() => {
    const list = pinnedRef.current;
    if (!list.length) return;
    const idx = Math.min(activePin, list.length - 1);
    document
      .getElementById(`msg-${list[idx].id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Freeze scroll-tracking briefly so the preview doesn't fight the glide.
    pinLockRef.current = Date.now() + 1200;
    setActivePin((idx + 1) % list.length);
  }, [activePin]);

  const jumpToBottom = useCallback(() => {
    scrollToBottom(true);
    setMissed(0);
  }, [scrollToBottom]);

  // Initial scroll to the latest message + mark everything seen.
  useEffect(() => {
    scrollToBottom(false);
    document.title = BASE_TITLE;
    markSeen(lastIdRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signal cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ─── Push notifications ──────────────────────────────────────────────────
  const detectNotif = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotif("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setNotif("blocked");
      return;
    }
    if (Notification.permission === "granted") {
      // Already granted — silently make sure our push subscription is live.
      try {
        const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          setNotif("push");
          return;
        }
        // Permission but no subscription → resubscribe silently if possible.
        const vapid = await fetch("/api/push/vapid", { cache: "no-store" });
        if (vapid.ok) {
          const { publicKey } = (await vapid.json()) as { publicKey: string };
          const reg2 =
            reg ??
            (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
          const fresh = await reg2.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(
              publicKey,
            ) as BufferSource,
          });
          const json = fresh.toJSON();
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: json }),
          });
          setNotif("push");
          return;
        }
      } catch {
        /* fall through to local */
      }
      setNotif("local");
      return;
    }
    setNotif("off");
  }, []);

  useEffect(() => {
    void detectNotif();
  }, [detectNotif]);

  const enableAlerts = useCallback(async () => {
    if (notif === "blocked" || notif === "unsupported" || notif === "loading")
      return;
    try {
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        setNotif("blocked");
        return;
      }
      if (perm !== "granted") return;
      await detectNotif();
    } catch {
      setNotif("local");
    }
  }, [detectNotif, notif]);

  // ─── Sending ─────────────────────────────────────────────────────────────
  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic: Msg = {
      id: -Date.now(),
      profile,
      text,
      kind: "text",
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    requestAnimationFrame(() => scrollToBottom(true));
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
        markSeen(lastIdRef.current);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? data.message : m)),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    }
    setSending(false);
  };

  const sendSignal = async () => {
    if (cooldown > 0) return;
    setCooldown(10);
    const optimistic: Msg = {
      id: -Date.now(),
      profile,
      text: "",
      kind: "signal",
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => scrollToBottom(true));
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "signal" }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
        markSeen(lastIdRef.current);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? data.message : m)),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  const remove = async (id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/messages?id=${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  };

  const saveEdit = async () => {
    if (!editing) return;
    const text = editDraft.trim();
    if (!text) return;
    const { id } = editing;
    const before = messages.find((m) => m.id === id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, text, editedAt: new Date().toISOString() } : m,
      ),
    );
    setEditing(null);
    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? data.message : m)),
        );
      } else if (before) {
        setMessages((prev) => prev.map((m) => (m.id === id ? before : m)));
      }
    } catch {
      if (before) setMessages((prev) => prev.map((m) => (m.id === id ? before : m)));
    }
  };

  const togglePin = async (msg: Msg) => {
    const pinned = !msg.pinnedAt;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              pinnedAt: pinned ? new Date().toISOString() : null,
              pinnedBy: pinned ? profile : null,
            }
          : m,
      ),
    );
    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, pinned }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? data.message : m)),
        );
      }
    } catch {
      /* revert on next poll */
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────
  const lastOwnId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].profile === profile && !messages[i].pending)
        return messages[i].id;
    }
    return null;
  }, [messages, profile]);

  // Ordered by where they sit in the conversation — newest message first.
  const pinned = useMemo(
    () => messages.filter((m) => m.pinnedAt).sort((a, b) => b.id - a.id),
    [messages],
  );
  pinnedRef.current = pinned;

  const grouped = useMemo(() => {
    const out: Array<
      { type: "sep"; label: string; key: string } | { type: "msg"; msg: Msg; key: string }
    > = [];
    let lastDay = "";
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      if (key !== lastDay) {
        out.push({ type: "sep", label: dayLabel(m.createdAt), key: `sep-${key}` });
        lastDay = key;
      }
      out.push({ type: "msg", msg: m, key: `m-${m.id}` });
    }
    return out;
  }, [messages]);

  const notifLabel: Record<NotifState, string> = {
    loading: "checking alerts…",
    unsupported: "alerts not supported here",
    off: "turn on alerts",
    blocked: "alerts blocked in browser",
    local: "alerts on (app open)",
    push: "alerts on — even closed",
  };

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      {/* signal flash overlay — the bat-signal moment */}
      <AnimatePresence>
        {signalFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none fixed inset-0 z-[60]"
            style={{
              background:
                "radial-gradient(60% 45% at 50% 30%, rgba(107,199,198,0.28), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* in-app banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.key}
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong fixed left-1/2 top-20 z-50 flex items-center gap-2.5 rounded-full py-2 pl-3 pr-5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)]"
          >
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-white",
                banner.kind === "signal"
                  ? "bg-gradient-to-br from-aqua-400 to-lav-400"
                  : "bg-gradient-to-br from-rose-500 to-rose-600",
              )}
            >
              {banner.kind === "signal" ? (
                <Droplets className="h-3.5 w-3.5" />
              ) : (
                <HeartHandshake className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="text-xs text-ink">
              {banner.kind === "signal"
                ? `${partnerName} sent you a signal`
                : `${partnerName} whispered to you`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-rose-300/70">
            whispers
          </p>
          <h1 className="font-display mt-1 text-3xl italic text-ink sm:text-4xl">
            Between you &amp; {partnerName}
          </h1>
        </div>
        {notif !== "unsupported" && (
          <button
            onClick={enableAlerts}
            title={
              notif === "blocked"
                ? "Your browser blocked alerts — allow them in the site settings"
                : notif === "push" || notif === "local"
                  ? "Alerts are on"
                  : "Get notified when they message you"
            }
            className={cn(
              "mt-2 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] transition-colors",
              notif === "push" || notif === "local"
                ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300/90"
                : notif === "blocked"
                  ? "border-white/10 bg-white/[0.04] text-ink-faint"
                  : "border-rose-400/30 bg-rose-400/[0.07] text-rose-300 hover:border-rose-400/50",
            )}
          >
            {notif === "push" || notif === "local" ? (
              <BellRing className="h-3 w-3" />
            ) : notif === "blocked" ? (
              <BellOff className="h-3 w-3" />
            ) : (
              <Bell className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{notifLabel[notif]}</span>
            {(notif === "push" || notif === "local") && (
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
            )}
          </button>
        )}
      </div>

      {/* pinned bar — one at a time, follows where you're reading (Telegram) */}
      {pinned.length > 0 &&
        (() => {
          const idx = Math.min(activePin, pinned.length - 1);
          const m = pinned[idx];
          return (
            <div className="sticky top-14 z-20 -mx-1 mb-3 px-1 py-2">
              <motion.div
                layout
                style={{
                  background:
                    "linear-gradient(135deg, rgba(20,13,26,0.94), rgba(28,19,20,0.94))",
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-gold-300/25 px-3 py-2 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
              >
                {/* stack indicator — one segment per pin, active one lit */}
                {pinned.length > 1 ? (
                  <div className="flex h-8 w-[3px] shrink-0 flex-col-reverse gap-[3px]">
                    {pinned.slice(0, 6).map((p, i) => (
                      <span
                        key={p.id}
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          i === idx ? "bg-gold-300" : "bg-gold-300/25",
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="h-8 w-[3px] shrink-0 rounded-full bg-gold-300/70" />
                )}

                <button
                  onClick={jumpToPin}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-gold-300/80">
                    <Pin className="h-2.5 w-2.5 rotate-45" />
                    pinned
                    {pinned.length > 1 ? ` · ${idx + 1}/${pinned.length}` : ""}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      className="truncate text-xs text-ink"
                    >
                      {m.kind === "signal" ? "the splash signal" : m.text}
                    </motion.p>
                  </AnimatePresence>
                </button>

                <button
                  onClick={() => togglePin(m)}
                  aria-label="Unpin"
                  className="shrink-0 text-ink-faint transition-colors hover:text-rose-300"
                >
                  <PinOff className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            </div>
          );
        })()}

      {/* messages */}
      <div className="flex-1 space-y-1 pb-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <HeartHandshake className="h-8 w-8 text-rose-400/70" />
            <p className="font-display text-2xl italic text-ink">
              The silence is suspiciously loud.
            </p>
            <p className="text-sm text-ink-dim">
              Say the first hello, {meName}.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {grouped.map((row) =>
            row.type === "sep" ? (
              <div key={row.key} className="flex items-center gap-3 py-4">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-ink-faint">
                  {row.label}
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
            ) : row.msg.kind === "signal" ? (
              <SignalCard
                key={row.key}
                msg={row.msg}
                own={row.msg.profile === profile}
                senderName={row.msg.profile === profile ? meName : partnerName}
                onDelete={() => remove(row.msg.id)}
                onMenu={() => setSheet(row.msg)}
                receipt={
                  row.msg.id === lastOwnId
                    ? { seen: partnerSeenId >= row.msg.id, at: partnerSeenAt }
                    : null
                }
              />
            ) : (
              <Bubble
                key={row.key}
                msg={row.msg}
                own={row.msg.profile === profile}
                senderName={row.msg.profile === "him" ? undefined : partnerName}
                onDelete={() => remove(row.msg.id)}
                onMenu={() => setSheet(row.msg)}
                receipt={
                  row.msg.id === lastOwnId
                    ? { seen: partnerSeenId >= row.msg.id, at: partnerSeenAt }
                    : null
                }
              />
            ),
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* message actions */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(null)}
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong fixed inset-x-4 bottom-6 z-[71] mx-auto max-w-sm overflow-hidden rounded-[1.75rem] p-2 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)]"
            >
              <p className="truncate px-4 pb-2 pt-3 text-[11px] text-ink-faint">
                {sheet.kind === "signal" ? "the splash signal" : sheet.text}
              </p>

              <SheetAction
                icon={sheet.pinnedAt ? PinOff : Pin}
                label={sheet.pinnedAt ? "Unpin from top" : "Pin to top"}
                onClick={() => {
                  togglePin(sheet);
                  setSheet(null);
                }}
              />

              {sheet.profile === profile && sheet.kind !== "signal" && (
                <SheetAction
                  icon={Pencil}
                  label="Edit message"
                  onClick={() => {
                    setEditDraft(sheet.text);
                    setEditing({ id: sheet.id });
                    setSheet(null);
                  }}
                />
              )}

              {sheet.profile === profile && (
                <SheetAction
                  icon={Trash2}
                  label="Delete message"
                  danger
                  onClick={() => {
                    remove(sheet.id);
                    setSheet(null);
                  }}
                />
              )}

              <SheetAction
                icon={X}
                label="Cancel"
                muted
                onClick={() => setSheet(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* edit box */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(null)}
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong fixed inset-x-4 bottom-6 z-[71] mx-auto max-w-sm rounded-[1.75rem] p-5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)]"
            >
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-rose-300/70">
                edit your words
              </p>
              <textarea
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void saveEdit();
                  }
                  if (e.key === "Escape") setEditing(null);
                }}
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-rose-400/50"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editDraft.trim()}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-white shadow-glow-rose disabled:opacity-35"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* jump to latest */}
      <AnimatePresence>
        {showJump && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={jumpToBottom}
            aria-label="Jump to the latest message"
            className="glass-strong fixed bottom-[11.5rem] right-4 z-40 grid h-11 w-11 place-items-center rounded-full text-ink-dim shadow-[0_12px_30px_-10px_rgba(0,0,0,0.85)] transition-colors hover:text-ink sm:right-6"
          >
            <ChevronDown className="h-5 w-5" />
            {missed > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-1 text-[10px] font-semibold leading-none text-white shadow-glow-rose"
              >
                {missed > 9 ? "9+" : missed}
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* composer */}
      <div className="sticky bottom-24 z-30 pb-1 pt-2">
        {/* veil: blurs + fades whatever scrolls beneath the composer & nav */}
        {/* Telegram-style: heavy blur, only partly opaque, so the messages
            underneath stay as soft ghosts — you can tell they're there
            without being able to read them. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-100vw] bottom-[-8rem] top-[-7rem] -z-10 backdrop-blur-[5px] backdrop-saturate-150"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.7) 38%, black 55%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.7) 38%, black 55%)",
            background:
              "linear-gradient(to bottom, rgba(12,8,16,0) 0%, rgba(12,8,16,0.22) 24%, rgba(12,8,16,0.45) 44%, rgba(12,8,16,0.62) 62%, rgba(12,8,16,0.72) 100%)",
          }}
        />
        <div className="glass-strong relative flex items-center gap-2 rounded-full py-1.5 pl-5 pr-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Something for ${partnerName}…`}
            maxLength={2000}
            className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-ink-faint/60 outline-none"
          />

          {/* the splash signal */}
          <button
            onClick={sendSignal}
            disabled={cooldown > 0}
            title={
              cooldown > 0
                ? `Signal recharging — ${cooldown}s`
                : `Send the splash signal to ${partnerName}`
            }
            aria-label="Send the splash signal"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-all hover:scale-105 disabled:hover:scale-100"
            style={{
              background:
                cooldown > 0
                  ? "linear-gradient(140deg, rgba(107,199,198,0.25), rgba(180,140,226,0.2))"
                  : "linear-gradient(140deg, #6bc7c6 0%, #b48ce2 100%)",
              boxShadow:
                cooldown > 0
                  ? "none"
                  : "0 8px 26px -8px rgba(107,199,198,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <Droplets
              className={cn("h-4 w-4", cooldown > 0 && "opacity-50")}
            />
            {cooldown > 0 && (
              <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgba(164,227,226,0.9)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${((10 - cooldown) / 10) * 97.4} 97.4`}
                />
              </svg>
            )}
          </button>

          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-glow-rose transition-all hover:scale-105 disabled:opacity-35 disabled:hover:scale-100"
            aria-label="Send"
          >
            {sending ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
              />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 pr-2 text-right text-[9px] uppercase tracking-[0.2em] text-ink-faint/50">
          the droplets button is a signal — one tap says it all
        </p>
      </div>
    </div>
  );
}

/** Long-press (mobile) + right-click (desktop) → open the actions sheet. */
function useLongPress(onTrigger: () => void, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    onContextMenu: (e: React.MouseEvent) => {
      if (!enabled) return;
      e.preventDefault();
      onTrigger();
    },
    onTouchStart: () => {
      if (!enabled) return;
      moved.current = false;
      clear();
      timer.current = setTimeout(() => {
        if (!moved.current) onTrigger();
      }, 450);
    },
    onTouchMove: () => {
      moved.current = true;
      clear();
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}

// ─── One row in the actions sheet ───────────────────────────────────────────
function SheetAction({
  icon: Icon,
  label,
  onClick,
  danger,
  muted,
}: {
  icon: typeof Pin;
  label: string;
  onClick: () => void;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-colors hover:bg-white/[0.06]",
        danger ? "text-rose-300" : muted ? "text-ink-faint" : "text-ink",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

// ─── Seen receipt footer ────────────────────────────────────────────────────
function Receipt({
  msg,
  receipt,
}: {
  msg: Msg;
  receipt: { seen: boolean; at: string | null } | null;
}) {
  if (msg.pending)
    return <p className="mt-1 px-2 text-[10px] text-ink-faint/70">sending…</p>;
  if (!receipt)
    return (
      <p className="mt-1 px-2 text-[10px] text-ink-faint/70">
        {fmtTime(msg.createdAt)}
        {msg.editedAt ? " · edited" : ""}
      </p>
    );
  return (
    <p className="mt-1 flex items-center justify-end gap-1 px-2 text-[10px]">
      <span className="text-ink-faint/70">
        {fmtTime(msg.createdAt)}
        {msg.editedAt ? " · edited" : ""}
      </span>
      <span className="text-ink-faint/40">·</span>
      {receipt.seen ? (
        <span className="flex items-center gap-1 font-medium text-rose-300">
          <CheckCheck className="h-3 w-3" />
          seen{receipt.at ? ` ${fmtTime(receipt.at)}` : ""}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-ink-faint/70">
          <Check className="h-3 w-3" />
          sent
        </span>
      )}
    </p>
  );
}

// ─── Normal bubble ──────────────────────────────────────────────────────────
function Bubble({
  msg,
  own,
  senderName,
  onDelete,
  onMenu,
  receipt,
}: {
  msg: Msg;
  own: boolean;
  senderName?: string;
  onDelete: () => void;
  onMenu: () => void;
  receipt: { seen: boolean; at: string | null } | null;
}) {
  const press = useLongPress(onMenu, !msg.pending);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      id={`msg-${msg.id}`}
      className={cn("group flex", own ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[80%] sm:max-w-[70%]", own ? "text-right" : "text-left")}>
        <div
          {...press}
          className={cn(
            "relative inline-block cursor-default select-none whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-left text-sm leading-relaxed",
            own
              ? "rounded-br-lg bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_30px_-12px_rgba(229,109,138,0.55)]"
              : "glass rounded-bl-lg text-ink",
            msg.pinnedAt && "ring-1 ring-gold-300/40",
            msg.pending && "opacity-60",
          )}
        >
          {msg.pinnedAt && (
            <Pin
              className={cn(
                "absolute -top-1.5 h-3 w-3 rotate-45 text-gold-300",
                own ? "-left-1.5" : "-right-1.5",
              )}
            />
          )}
          {msg.text}
          {!msg.pending && (
            <button
              onClick={onMenu}
              aria-label="Message options"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-ink-faint opacity-0 transition-opacity hover:text-rose-300 focus:opacity-100 group-hover:opacity-70",
                own ? "-left-7" : "-right-7",
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
        {own ? (
          <Receipt msg={msg} receipt={receipt} />
        ) : (
          <p className="mt-1 px-2 text-[10px] text-ink-faint/70">
            {senderName ? `${senderName} · ` : ""}
            {fmtTime(msg.createdAt)}
            {msg.editedAt ? " · edited" : ""}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── The splash signal ──────────────────────────────────────────────────────
function SignalCard({
  msg,
  own,
  senderName,
  onDelete,
  onMenu,
  receipt,
}: {
  msg: Msg;
  own: boolean;
  senderName: string;
  onDelete: () => void;
  onMenu: () => void;
  receipt: { seen: boolean; at: string | null } | null;
}) {
  const press = useLongPress(onMenu, !msg.pending);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      id={`msg-${msg.id}`}
      className="group py-2"
    >
      <div
        {...press}
        className="relative select-none overflow-hidden rounded-[1.75rem] border border-aqua-300/25 p-4 sm:p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(107,199,198,0.13), rgba(180,140,226,0.10) 55%, rgba(229,109,138,0.07))",
          boxShadow: msg.pinnedAt
            ? "0 16px 44px -18px rgba(224,181,120,0.5)"
            : "0 16px 44px -18px rgba(107,199,198,0.45)",
        }}
      >
        {/* shimmer sweep */}
        <div
          aria-hidden
          className="animate-shimmer-sweep pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(100deg, transparent 30%, rgba(164,227,226,0.12) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
          }}
        />
        <div className="relative flex items-center gap-4">
          {/* pulsing beacon */}
          <div className="relative grid h-12 w-12 shrink-0 place-items-center">
            <span className="animate-signal-ring absolute inset-0 rounded-full border-2 border-aqua-300/60" />
            <span
              className="animate-signal-ring absolute inset-0 rounded-full border-2 border-lav-400/50"
              style={{ animationDelay: "1.2s" }}
            />
            <span
              className="grid h-11 w-11 place-items-center rounded-full text-white"
              style={{
                background: "linear-gradient(140deg, #6bc7c6 0%, #b48ce2 100%)",
                boxShadow:
                  "0 8px 26px -6px rgba(107,199,198,0.8), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              <Droplets className="h-5 w-5" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl italic leading-tight text-ink">
              {own ? "You sent the signal out" : `${senderName} is calling you`}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-dim">
              {own
                ? `the splash signal — now ${senderName === "You" ? "" : "they"} can't miss it`
                : "the splash signal — drop what you're doing"}
            </p>
          </div>
          {!msg.pending && (
            <button
              onClick={onMenu}
              aria-label="Signal options"
              className="shrink-0 text-ink-faint opacity-0 transition-opacity hover:text-rose-300 focus:opacity-100 group-hover:opacity-70"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className={cn(own ? "text-right" : "text-left")}>
        {own ? (
          <Receipt msg={msg} receipt={receipt} />
        ) : (
          <p className="mt-1 px-2 text-[10px] text-ink-faint/70">
            {senderName} · {fmtTime(msg.createdAt)}
          </p>
        )}
      </div>
    </motion.div>
  );
}
