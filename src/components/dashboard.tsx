"use client";

import { motion } from "framer-motion";
import {
  CalendarHeart,
  ChevronRight,
  Droplets,
  Flame,
  Images,
  MessageCircle,
  PenLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { EVENT_COLORS } from "@/lib/types";
import { Modal, btnPrimaryCls, inputCls, Field, Eyebrow } from "@/components/ui";

interface CycleSummary {
  hasData: boolean;
  currentDay: number | null;
  daysUntilPeriod: number | null;
  phaseLabel: string | null;
  phaseColor: string | null;
}

interface NextEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  color: string;
  daysAway: number;
  isToday: boolean;
  isTomorrow: boolean;
  doneItems: number;
  totalItems: number;
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function greetingFor(hour: number) {
  if (hour < 5) return "Still awake,";
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

export function Dashboard({
  profile,
  meName,
  partnerName,
  himName,
  herName,
  anniversary,
  daysTogether,
  prompt,
  cycle,
  nextEvent,
  todayEventsCount,
  lastMessage,
  memoriesCount,
  latestMemory,
  lastDraw,
}: {
  profile: Profile;
  meName: string;
  partnerName: string;
  himName: string;
  herName: string;
  anniversary: string | null;
  daysTogether: number | null;
  prompt: string;
  cycle: CycleSummary;
  nextEvent: NextEvent | null;
  todayEventsCount: number;
  lastMessage: { text: string; profile: string; createdAt: string } | null;
  memoriesCount: number;
  latestMemory: { imageUrl: string; caption: string } | null;
  lastDraw: { title: string; intensity: number } | null;
}) {
  const router = useRouter();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [dateValue, setDateValue] = useState(anniversary ?? "");
  const [saving, setSaving] = useState(false);

  if (typeof window !== "undefined" && !mounted) {
    setMounted(true);
    setGreeting(greetingFor(new Date().getHours()));
  }

  const saveAnniversary = async () => {
    if (!dateValue || saving) return;
    setSaving(true);
    await fetch("/api/couple", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anniversary: dateValue }),
    }).catch(() => undefined);
    setDateOpen(false);
    setSaving(false);
    router.refresh();
  };

  const prettyDate = anniversary
    ? new Date(`${anniversary}T00:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* greeting */}
      <motion.div variants={rise} initial="hidden" animate="show" custom={0}>
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-rose-300/70">
          {greeting ?? "\u00A0"}
        </p>
        <h1 className="font-display mt-1 text-4xl italic leading-tight text-ink sm:text-5xl">
          {meName}, <span className="not-italic text-ink-dim">{partnerName} misses you.</span>
        </h1>
      </motion.div>

      {/* hero — days together */}
      <motion.section
        variants={rise}
        initial="hidden"
        animate="show"
        custom={1}
        className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8"
      >
        <img
          src="/img/roses.jpg"
          alt=""
          aria-hidden
          className="absolute -right-10 -top-16 h-64 w-64 rounded-full object-cover opacity-25 blur-[1px] [mask-image:radial-gradient(circle,black,transparent_72%)]"
        />
        <div className="relative">
          <Eyebrow>together for</Eyebrow>
          {daysTogether !== null ? (
            <>
              <div className="mt-1 flex items-end gap-3">
                <span className="font-display text-rose-glow text-7xl font-medium leading-none text-ink sm:text-8xl">
                  {daysTogether.toLocaleString()}
                </span>
                <span className="mb-2 font-display text-2xl italic text-ink-dim">
                  days
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-dim">
                <span className="text-ink">{himName}</span>
                <span className="mx-2 font-display italic text-gold-300">&amp;</span>
                <span className="text-ink">{herName}</span>
                <span className="text-ink-faint"> · since {prettyDate}</span>
              </p>
            </>
          ) : (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="font-display max-w-xs text-xl italic text-ink-dim">
                When did our story officially begin?
              </p>
              <button onClick={() => setDateOpen(true)} className={btnPrimaryCls}>
                <PenLine className="h-3.5 w-3.5" /> Set our date
              </button>
            </div>
          )}
          {daysTogether !== null && (
            <button
              onClick={() => setDateOpen(true)}
              className="absolute right-0 top-0 text-[10px] uppercase tracking-[0.2em] text-ink-faint transition-colors hover:text-rose-300"
            >
              edit date
            </button>
          )}
        </div>
      </motion.section>

      {/* prompt of the day */}
      <motion.section
        variants={rise}
        initial="hidden"
        animate="show"
        custom={2}
        className="glass relative overflow-hidden rounded-[2rem] p-6"
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-400/10 blur-2xl" />
        <div className="mb-2 flex items-center gap-2 text-gold-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-[0.3em]">
            today&apos;s spark — ask each other
          </span>
        </div>
        <p className="font-display text-2xl italic leading-snug text-ink">
          “{prompt}”
        </p>
      </motion.section>

      {/* tiles */}
      <div className="grid grid-cols-2 gap-4">
        {/* cycle */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={3}>
          <Link href="/cycle" className="glass group flex h-full min-h-[10.5rem] flex-col justify-between rounded-[1.75rem] p-5 transition-colors hover:border-white/20">
            <div className="flex items-center justify-between text-ink-faint">
              <Droplets className="h-4 w-4 text-rose-400" />
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div>
              {cycle.hasData ? (
                <>
                  <p className="font-display text-3xl leading-none text-ink">
                    Day {cycle.currentDay}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: cycle.phaseColor ?? "#666" }}
                    />
                    <span className="text-ink-dim">{cycle.phaseLabel}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {cycle.daysUntilPeriod !== null && cycle.daysUntilPeriod < 0
                      ? `${Math.abs(cycle.daysUntilPeriod)} days late — log it when it comes`
                      : cycle.daysUntilPeriod === 0
                        ? "period expected today"
                        : `next period in ~${cycle.daysUntilPeriod} days`}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl italic leading-tight text-ink">
                    Her rhythm
                  </p>
                  <p className="mt-2 text-[11px] text-ink-faint">
                    Log a period start to unlock predictions
                  </p>
                </>
              )}
            </div>
          </Link>
        </motion.div>

        {/* deck */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={4}>
          <Link
            href="/spicy"
            className="group relative flex h-full min-h-[10.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-rose-400/25 p-5"
            style={{
              background: "linear-gradient(150deg, rgba(229,109,138,0.16), rgba(70,20,55,0.35))",
            }}
          >
            <img
              src="/img/deck.jpg"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-30 [mask-image:linear-gradient(120deg,black,transparent_70%)]"
            />
            <div className="relative flex items-center justify-between text-rose-300">
              <Flame className="h-4 w-4" />
              <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-rose-300/80">
                for tonight
              </span>
            </div>
            <div className="relative">
              <p className="font-display text-2xl italic leading-tight text-ink">
                Draw a card
              </p>
              <p className="mt-1 text-[11px] text-ink-dim">
                {lastDraw ? `last drawn: “${lastDraw.title}”` : "the deck is restless"}
              </p>
            </div>
          </Link>
        </motion.div>

        {/* next event */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={5}>
          <Link href="/calendar" className="glass group flex h-full min-h-[10.5rem] flex-col justify-between rounded-[1.75rem] p-5 transition-colors hover:border-white/20">
            <div className="flex items-center justify-between text-ink-faint">
              <CalendarHeart className="h-4 w-4 text-gold-300" />
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div>
              {nextEvent ? (
                <>
                  <p className="font-display truncate text-2xl italic leading-tight text-ink">
                    {nextEvent.title}
                  </p>
                  <p className="mt-2 text-xs">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
                      style={{
                        background: `${EVENT_COLORS[nextEvent.color]}22`,
                        color: EVENT_COLORS[nextEvent.color],
                      }}
                    >
                      {nextEvent.isToday
                        ? "today!"
                        : nextEvent.isTomorrow
                          ? "tomorrow"
                          : `in ${nextEvent.daysAway} days`}
                    </span>
                    {todayEventsCount > 0 && !nextEvent.isToday && (
                      <span className="ml-1.5 text-[11px] text-ink-faint">
                        + {todayEventsCount} today
                      </span>
                    )}
                  </p>
                  {nextEvent.totalItems > 0 && (
                    <div className="mt-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gold-300"
                          style={{
                            width: `${Math.round((nextEvent.doneItems / nextEvent.totalItems) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-ink-faint">
                        {nextEvent.doneItems}/{nextEvent.totalItems} ready
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="font-display text-2xl italic leading-tight text-ink">
                    Plan us
                  </p>
                  <p className="mt-2 text-[11px] text-ink-faint">
                    No events yet — dream one up
                  </p>
                </>
              )}
            </div>
          </Link>
        </motion.div>

        {/* chat */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={6}>
          <Link href="/chat" className="glass group flex h-full min-h-[10.5rem] flex-col justify-between rounded-[1.75rem] p-5 transition-colors hover:border-white/20">
            <div className="flex items-center justify-between text-ink-faint">
              <MessageCircle className="h-4 w-4 text-aqua-300" />
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div>
              <p className="font-display text-2xl italic leading-tight text-ink">
                Whisper
              </p>
              <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-ink-dim">
                {lastMessage
                  ? `${lastMessage.profile === profile ? "You" : partnerName}: ${lastMessage.text}`
                  : "nothing said yet — break the silence"}
              </p>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* memories strip */}
      <motion.div variants={rise} initial="hidden" animate="show" custom={7}>
        <Link href="/memories" className="glass group flex items-center gap-4 overflow-hidden rounded-[1.75rem] p-4 transition-colors hover:border-white/20">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
            {latestMemory ? (
              <img
                src={latestMemory.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-plum-800 to-plum-700">
                <Images className="h-5 w-5 text-ink-faint" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl italic text-ink">Our memories</p>
            <p className="truncate text-[11px] text-ink-faint">
              {memoriesCount > 0
                ? `${memoriesCount} kept ${memoriesCount === 1 ? "moment" : "moments"}${latestMemory?.caption ? ` · “${latestMemory.caption}”` : ""}`
                : "pin the moments you never want to lose"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>

      {/* anniversary modal */}
      <Modal open={dateOpen} onClose={() => setDateOpen(false)} title="Our beginning">
        <p className="mb-4 text-sm text-ink-dim">
          The day it became official. We&apos;ll count every sunrise from there.
        </p>
        <Field label="Anniversary">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={cn(inputCls, "text-base")}
          />
        </Field>
        <button
          onClick={saveAnniversary}
          disabled={!dateValue || saving}
          className={cn(btnPrimaryCls, "mt-5 w-full")}
        >
          {saving ? "Saving…" : "Start the count"}
        </button>
      </Modal>
    </div>
  );
}
