"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  Droplets,
  Flame,
  House,
  Images,
  Lock,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { playMessageChime, playSignalChime } from "@/lib/sound";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/cycle", label: "Cycle", icon: Droplets },
];

function HeartMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("text-rose-400", className)}
      aria-hidden
    >
      <path d="M12 21s-7.5-4.9-9.7-9.2C.7 8.9 2.4 5.3 5.8 4.6 7.7 4.2 9.6 5 10.7 6.5c.4.5.8 1.1 1.3 1.9.5-.8.9-1.4 1.3-1.9 1.1-1.5 3-2.3 4.9-1.9 3.4.7 5.1 4.3 3.5 7.2C19.5 16.1 12 21 12 21Z" />
    </svg>
  );
}

export function Chrome({
  profile,
  himName,
  herName,
  children,
}: {
  profile: Profile | null;
  himName: string;
  herName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ── unread chat badge + soft alert while browsing other pages ──────────
  // NOTE: all hooks must live above the early return below — hook count
  // must stay identical whether we're locked out or signed in.
  const [unread, setUnread] = useState<{
    count: number;
    latestId: number | null;
    latestKind: "text" | "signal";
  }>({ count: 0, latestId: null, latestKind: "text" });
  const [memUnread, setMemUnread] = useState(0);
  const lastUnseenRef = useRef(0);

  const pollUnread = useCallback(async () => {
    if (!profile || pathname === "/unlock") return;
    try {
      const res = await fetch("/api/chat/unread", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        count: number;
        latestId: number | null;
        latestKind: "text" | "signal";
      };
      setUnread(data);

      // Chime once per brand-new message, but never on the chat page
      // (the chat room handles its own alerts) and never twice per id.
      if (
        data.count > 0 &&
        data.latestId !== null &&
        data.latestId > lastUnseenRef.current &&
        !pathname.startsWith("/chat")
      ) {
        try {
          const raw = localStorage.getItem("ours_last_ping");
          if (raw) {
            const stamp = JSON.parse(raw) as { id: number; t: number };
            if (stamp.id === data.latestId && Date.now() - stamp.t < 8000) {
              lastUnseenRef.current = data.latestId;
              return;
            }
          }
        } catch {
          /* ignore */
        }
        localStorage.setItem(
          "ours_last_ping",
          JSON.stringify({ id: data.latestId, t: Date.now() }),
        );
        if (data.latestKind === "signal") playSignalChime();
        else playMessageChime();
      }
      if (data.latestId !== null) {
        lastUnseenRef.current = Math.max(lastUnseenRef.current, data.latestId);
      }
    } catch {
      /* offline — next tick */
    }

    // New memories on the wall?
    try {
      const res = await fetch("/api/memories/unread", { cache: "no-store" });
      if (res.ok) {
        const m = (await res.json()) as { count: number };
        setMemUnread(m.count);
      }
    } catch {
      /* offline — next tick */
    }
  }, [pathname, profile]);

  useEffect(() => {
    void pollUnread();
    const t = setInterval(pollUnread, 6000);
    return () => clearInterval(t);
  }, [pollUnread]);

  // Instant badge refresh when a push is forwarded to the open tab.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "ours:push") void pollUnread();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [pollUnread]);

  // The hideaway is a world of its own — no header, no nav, no chrome.
  if (pathname.startsWith("/hideaway")) {
    return <>{children}</>;
  }

  // Locked-out shell (lock screen). Hooks all live above this line.
  if (pathname === "/unlock" || !profile) {
    return (
      <div className="relative z-10 min-h-dvh">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    );
  }

  const profileName = profile === "him" ? himName : herName;

  const signOut = async () => {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => undefined);
    startTransition(() => {
      router.replace("/unlock");
      router.refresh();
    });
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      {/* ── top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40">
        <div className="relative isolate border-b border-white/[0.08]">
          {/* same frosted treatment as the bottom menu */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 backdrop-blur-[5px] backdrop-saturate-150"
            style={{
              background:
                "linear-gradient(135deg, rgba(12,8,16,0.12), rgba(12,8,16,0.2))",
            }}
          />
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-ink ring-focus rounded-full"
            >
              <HeartMark className="h-4 w-4 drop-shadow-[0_0_8px_rgba(229,109,138,0.8)]" />
              <span className="font-display text-xl italic leading-none tracking-wide">
                ours.
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-ink-dim transition-colors hover:border-rose-400/30 hover:text-ink",
                )}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-[10px] font-semibold text-white shadow-glow-rose">
                  {profileName.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[7rem] truncate">{profileName}</span>
              </Link>
              <button
                onClick={signOut}
                disabled={pending}
                title="Lock the app"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-ink-dim transition-colors hover:border-rose-400/40 hover:text-rose-300"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── page ────────────────────────────────────────────────── */}
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-36 pt-6 sm:px-6"
      >
        {children}
      </motion.main>

      {/* ── bottom nav ──────────────────────────────────────────── */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto relative isolate flex items-end gap-0.5 rounded-full px-3 py-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.55)]">
            {/* frosted backdrop layer — same proven pattern as the chat veil,
                because Safari ignores backdrop-filter on the container itself */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full border border-white/[0.08] backdrop-blur-[5px] backdrop-saturate-150"
              style={{
                background:
                  "linear-gradient(135deg, rgba(12,8,16,0.12), rgba(12,8,16,0.2))",
              }}
            />
          {NAV.slice(0, 3).map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              badge={
                item.href === "/chat"
                  ? unread
                  : item.href === "/memories"
                    ? { count: memUnread, latestKind: "text" as const }
                    : undefined
              }
            />
          ))}

          {/* the spicy center */}
          <Link
            href="/spicy"
            aria-label="The Deck"
            className="group relative mx-2 -mt-9 block ring-focus rounded-full"
          >
            <span
              className={cn(
                "grid h-16 w-16 place-items-center rounded-full border border-rose-300/40 text-white transition-transform duration-300 group-hover:scale-105",
                isActive("/spicy") ? "scale-105" : "",
              )}
              style={{
                background:
                  "linear-gradient(140deg,#e56d8a 0%,#b0306e 55%,#6d1d52 100%)",
                boxShadow:
                  "0 10px 30px -8px rgba(229,109,138,0.65), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              <Flame
                className={cn(
                  "h-6 w-6 transition-all",
                  isActive("/spicy") && "drop-shadow-[0_0_10px_rgba(255,220,230,0.9)]",
                )}
              />
            </span>
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[9px] font-medium uppercase tracking-[0.18em] text-rose-300/70">
              Deck
            </span>
          </Link>

          {NAV.slice(3).map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              badge={
                item.href === "/chat"
                  ? unread
                  : item.href === "/memories"
                    ? { count: memUnread, latestKind: "text" as const }
                    : undefined
              }
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
  badge?: { count: number; latestKind: "text" | "signal" };
}) {
  return (
    <Link
      href={href}
      className={cn(
        "ring-focus relative flex w-14 flex-col items-center gap-0.5 rounded-full px-2 py-2 transition-colors sm:w-16",
        active ? "text-rose-300" : "text-ink-faint hover:text-ink-dim",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-x-1 top-0.5 bottom-[18px] rounded-full bg-rose-400/10"
        />
      )}
      <span className="relative">
        <Icon className="relative h-[19px] w-[19px]" strokeWidth={1.8} />
        {badge && badge.count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className={cn(
              "absolute -right-2.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-semibold leading-none text-white",
              badge.latestKind === "signal"
                ? "bg-gradient-to-br from-aqua-400 to-lav-400 shadow-[0_0_10px_rgba(107,199,198,0.8)]"
                : "bg-gradient-to-br from-rose-500 to-rose-600 shadow-glow-rose",
            )}
          >
            {badge.count > 9 ? "9+" : badge.count}
          </motion.span>
        )}
      </span>
      <span className="relative text-[9px] font-medium uppercase tracking-[0.14em]">
        {label}
      </span>
    </Link>
  );
}
