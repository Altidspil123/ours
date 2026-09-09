"use client";

import { motion } from "framer-motion";
import { HeartHandshake, KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default function UnlockPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [names, setNames] = useState({ him: "Him", her: "Her" });
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  // Peek at couple names to personalize the lock screen (public-safe).
  useEffect(() => {
    fetch("/api/couple")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.couple)
          setNames({ him: d.couple.himName, her: d.couple.herName });
      })
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    if (busy) return;
    if (!profile) {
      setHint(true);
      return;
    }
    if (!passcode.trim()) return;
    setBusy(true);
    setError(null);
    setHint(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, passcode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Wrong code, love.");
        setShake((s) => s + 1);
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("The universe hiccuped. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6">
      {/* backdrop artwork */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <img
          src="/img/roses.jpg"
          alt=""
          className="h-full w-full object-cover opacity-35 [mask-image:radial-gradient(75%_65%_at_50%_45%,black,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-plum-950/60 via-plum-950/40 to-plum-950" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-rose-400/60" />
          <HeartHandshake className="h-5 w-5 text-rose-400 drop-shadow-[0_0_12px_rgba(229,109,138,0.9)]" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-rose-400/60" />
        </div>

        <h1 className="font-display text-rose-glow text-7xl italic leading-none text-ink">
          ours.
        </h1>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.4em] text-ink-dim">
          a universe for two
        </p>

        <div className="glass mt-10 rounded-[2rem] p-6 text-left shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint">
            who&apos;s knocking?
          </p>
          <motion.div
            animate={hint ? { scale: [1, 1.03, 1, 1.02, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 gap-2"
          >
            {(["him", "her"] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setProfile(p);
                  setHint(false);
                }}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-sm transition-all duration-300",
                  profile === p
                    ? "border-rose-400/60 bg-rose-400/15 text-ink shadow-glow-rose"
                    : hint
                      ? "border-rose-400/50 bg-rose-400/10 text-ink-dim"
                      : "border-white/10 bg-white/[0.03] text-ink-dim hover:border-white/25 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full text-base font-semibold",
                    profile === p
                      ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white"
                      : "bg-white/10 text-ink-dim",
                  )}
                >
                  {names[p].slice(0, 1).toUpperCase()}
                </span>
                {p === "him" ? names.him : names.her}
              </button>
            ))}
          </motion.div>

          {hint && !profile && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center text-xs font-medium text-rose-300"
            >
              First tap who&apos;s knocking — Him or Her — then the code.
            </motion.p>
          )}

          <motion.div
            key={shake}
            initial={{ x: 0 }}
            animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 transition-colors focus-within:border-rose-400/50">
              <KeyRound className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="our secret code"
                autoComplete="off"
                className="w-full bg-transparent py-3.5 text-sm text-ink placeholder:text-ink-faint/60 outline-none"
              />
            </div>
          </motion.div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center text-xs text-rose-400"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={submit}
            disabled={!passcode.trim() || busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 bg-[length:200%_100%] py-3.5 text-sm font-medium text-white shadow-glow-rose transition-all hover:bg-[position:100%_0] disabled:opacity-35"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              "Come inside"
            )}
          </button>
        </div>

        <p className="mt-6 text-[11px] text-ink-faint">
          Only the two of you hold the key. No one else gets in.
        </p>
      </motion.div>
    </div>
  );
}
