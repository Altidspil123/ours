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
import { useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

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
        <div className="glass-strong border-x-0 border-t-0">
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
        <div className="pointer-events-auto glass-strong relative flex items-end gap-0.5 rounded-full px-3 py-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]">
          {NAV.slice(0, 3).map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
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
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
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
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
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
      <Icon className="relative h-[19px] w-[19px]" strokeWidth={1.8} />
      <span className="relative text-[9px] font-medium uppercase tracking-[0.14em]">
        {label}
      </span>
    </Link>
  );
}
