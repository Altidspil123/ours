"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Droplets,
  Heart,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PHASE_META, iso, type CyclePrediction } from "@/lib/cycle";
import { PageTitle, btnPrimaryCls, inputCls } from "@/components/ui";

interface CycleData {
  settings: {
    cycleLength: number;
    periodLength: number;
    autoCycle: boolean;
  };
  logs: string[];
  prediction: CyclePrediction;
}

export function CycleView({
  herName,
  initial,
}: {
  herName: string;
  initial: CycleData;
}) {
  const [data, setData] = useState(initial);
  const [dateDraft, setDateDraft] = useState(iso(new Date()));
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const p = data.prediction;

  const refetch = async () => {
    try {
      const res = await fetch("/api/cycle");
      if (!res.ok) return;
      const fresh = (await res.json()) as CycleData & { logs: { startDate: string }[] };
      // API returns full rows for logs in the shared shape already:
      setData({
        settings: {
          cycleLength: (fresh.settings as { cycleLength: number }).cycleLength,
          periodLength: (fresh.settings as { periodLength: number }).periodLength,
          autoCycle: (fresh.settings as { autoCycle: boolean }).autoCycle,
        },
        logs: Array.isArray(fresh.logs) ? (fresh.logs as string[]) : [],
        prediction: fresh.prediction,
      });
    } catch {
      /* keep local */
    }
  };

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2600);
  };

  const logPeriod = async () => {
    if (!dateDraft || busy) return;
    setBusy(true);
    const res = await fetch("/api/cycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: dateDraft }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      await refetch();
      notify("Logged. Predictions updated.");
    }
  };

  const removeLog = async (date: string) => {
    await fetch(`/api/cycle?date=${date}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    await refetch();
  };

  const updateSettings = async (patch: {
    cycleLength?: number;
    periodLength?: number;
    autoCycle?: boolean;
  }) => {
    await fetch("/api/cycle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
    await refetch();
  };

  return (
    <div>
      <PageTitle
        eyebrow="cycle tracker"
        hint={`Predictions get wiser with every logged cycle — based on ${herName}'s own rhythm, not a generic calendar.`}
      >
        Her rhythm, <span className="not-italic text-rose-300">our radar</span>
      </PageTitle>

      {/* flash toast */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-strong fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 text-sm text-ink shadow-glow-rose"
          >
            <Check className="h-3.5 w-3.5 text-rose-300" />
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
        {/* ── the wheel ──────────────────────────────────────────── */}
        <div className="glass mx-auto w-full max-w-sm rounded-[2rem] p-6">
          <CycleWheel prediction={p} />
          {/* phase legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {(["menstrual", "follicular", "ovulation", "luteal"] as const).map(
              (phase) => (
                <span
                  key={phase}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-faint"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PHASE_META[phase].color }}
                  />
                  {PHASE_META[phase].label}
                </span>
              ),
            )}
          </div>
          {p.phase && (
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-dim">
              {PHASE_META[p.phase].hint}
            </p>
          )}
        </div>

        {/* ── right column ───────────────────────────────────────── */}
        <div className="space-y-4">
          {/* headline stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-3xl p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-ink-faint">
                <Droplets className="h-3 w-3 text-rose-400" /> next period
              </p>
              {p.hasData ? (
                <>
                  <p className="font-display mt-2 text-2xl italic leading-tight text-ink">
                    {format(parseISO(p.nextPeriodStart!), "d MMMM")}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {p.daysUntilPeriod! < 0
                      ? `${Math.abs(p.daysUntilPeriod!)} days late — breathe, it happens`
                      : p.daysUntilPeriod === 0
                        ? "expected today"
                        : `in ~${p.daysUntilPeriod} days`}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-ink-faint">
                  log a period to unlock
                </p>
              )}
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-ink-faint">
                <Heart className="h-3 w-3 text-lav-400" /> fertile window
              </p>
              {p.hasData && p.fertileStart ? (
                <>
                  <p className="font-display mt-2 text-2xl italic leading-tight text-ink">
                    {format(parseISO(p.fertileStart), "d")}–
                    {format(parseISO(p.fertileEnd!), "d MMM")}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    peak: {format(parseISO(p.ovulationDate!), "d MMMM")} — magical days
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-ink-faint">
                  log a period to unlock
                </p>
              )}
            </div>
          </div>

          {/* settings */}
          <div className="glass rounded-3xl p-5">
            <p className="mb-4 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-ink-faint">
              <Waves className="h-3 w-3 text-gold-300" /> her numbers
            </p>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink">Learn from her history</p>
                <p className="text-[11px] text-ink-faint">
                  {data.settings.autoCycle
                    ? p.averageCycle
                      ? `averaging last cycles → ${p.averageCycle} days`
                      : "waiting for 2+ logged periods to average"
                    : "using the manual length below"}
                </p>
              </div>
              <button
                onClick={() =>
                  updateSettings({ autoCycle: !data.settings.autoCycle })
                }
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors",
                  data.settings.autoCycle ? "bg-rose-500" : "bg-white/15",
                )}
                aria-label="Toggle auto-averaging"
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow",
                    data.settings.autoCycle ? "right-1" : "left-1",
                  )}
                />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Stepper
                label="cycle length"
                unit="days"
                value={data.settings.autoCycle && p.averageCycle ? p.averageCycle : data.settings.cycleLength}
                disabled={data.settings.autoCycle}
                min={18}
                max={60}
                onChange={(v) => updateSettings({ cycleLength: v })}
              />
              <Stepper
                label="bleeding lasts"
                unit="days"
                value={data.settings.periodLength}
                min={2}
                max={10}
                onChange={(v) => updateSettings({ periodLength: v })}
              />
            </div>
          </div>

          {/* log */}
          <div className="glass rounded-3xl p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-ink-faint">
              <RefreshCw className="h-3 w-3 text-aqua-300" /> keep it honest
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateDraft}
                max={iso(new Date())}
                onChange={(e) => setDateDraft(e.target.value)}
                className={cn(inputCls, "w-auto")}
              />
              <button
                onClick={logPeriod}
                disabled={busy || !dateDraft}
                className={btnPrimaryCls}
              >
                <Droplets className="h-3.5 w-3.5" />
                {busy ? "Logging…" : "Period started"}
              </button>
            </div>

            {data.logs.length > 0 && (
              <LogHistory logs={data.logs} onRemove={removeLog} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── stepper input ─────────────────────────────────────────────────────────── */
function Stepper({
  label,
  unit,
  value,
  min,
  max,
  onChange,
  disabled = false,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2",
        disabled && "opacity-45",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.15em] text-ink-faint">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className="grid h-6 w-6 place-items-center rounded-full border border-white/10 text-ink-dim transition-colors hover:bg-white/10 disabled:pointer-events-none"
          aria-label="decrease"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-12 text-center text-sm text-ink">
          {value} <span className="text-[10px] text-ink-faint">{unit}</span>
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          className="grid h-6 w-6 place-items-center rounded-full border border-white/10 text-ink-dim transition-colors hover:bg-white/10 disabled:pointer-events-none"
          aria-label="increase"
        >
          <Plus className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

/* ── log history ───────────────────────────────────────────────────────────── */
function LogHistory({
  logs,
  onRemove,
}: {
  logs: string[];
  onRemove: (date: string) => void;
}) {
  const rows = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.localeCompare(b));
    return sorted
      .map((d, i) => ({
        index: i,
        date: d,
        gap:
          i > 0
            ? differenceInCalendarDays(parseISO(d), parseISO(sorted[i - 1]))
            : null,
      }))
      .reverse()
      .slice(0, 8);
  }, [logs]);

  return (
    <ul className="mt-4 space-y-1.5">
      {rows.map((row) => (
        <li
          key={row.date}
          className="group flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2"
        >
          <span className="text-sm text-ink-dim">
            {format(parseISO(row.date), "d MMMM yyyy")}
          </span>
          <span className="flex items-center gap-3">
            {row.gap !== null && (
              <span className="text-[11px] text-ink-faint">
                {row.gap}-day cycle
              </span>
            )}
            <button
              onClick={() => onRemove(row.date)}
              className="text-ink-faint opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-70"
              aria-label="Delete log"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── the wheel ─────────────────────────────────────────────────────────────── */
function CycleWheel({ prediction }: { prediction: CyclePrediction }) {
  const L = prediction.cycleLength;
  const P = prediction.periodLength;
  const ovDay = Math.min(Math.max(L - 14, P + 2), L - 1);

  const segments = [
    { from: 1, to: P, color: PHASE_META.menstrual.color },
    { from: P + 1, to: ovDay - 2, color: PHASE_META.follicular.color },
    { from: ovDay - 1, to: ovDay + 1, color: PHASE_META.ovulation.color },
    { from: ovDay + 2, to: L, color: PHASE_META.luteal.color },
  ].filter((s) => s.to >= s.from);

  const r = 118;
  const gapDeg = 1.4;
  const dayDeg = 360 / L;
  const angleFor = (day: number) => ((day - 0.5) / L) * 360 - 90;

  const arc = (from: number, to: number) => {
    const a0 = ((from - 1) / L) * 360 - 90 + gapDeg;
    const a1 = (to / L) * 360 - 90 - gapDeg;
    const rad0 = (a0 * Math.PI) / 180;
    const rad1 = (a1 * Math.PI) / 180;
    const x0 = r * Math.cos(rad0);
    const y0 = r * Math.sin(rad0);
    const x1 = r * Math.cos(rad1);
    const y1 = r * Math.sin(rad1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  const currentDay = prediction.currentDay ?? 0;
  const markerAngle =
    prediction.hasData && currentDay > 0
      ? currentDay <= L
        ? angleFor(currentDay)
        : 360 - dayDeg / 2 - 90
      : null;
  const markerRad = markerAngle !== null ? (markerAngle * Math.PI) / 180 : 0;
  const markerX = r * Math.cos(markerRad);
  const markerY = r * Math.sin(markerRad);
  const needleInner = r - 46;

  const phase = prediction.phase;

  return (
    <div className="relative">
      <svg viewBox="-160 -160 320 320" className="mx-auto block w-full max-w-[300px]">
        {/* faint full ring */}
        <circle
          cx="0"
          cy="0"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="26"
        />
        {/* day ticks */}
        {Array.from({ length: L }, (_, i) => {
          const rad = (angleFor(i + 1) * Math.PI) / 180;
          const ro = r + 21;
          const ri = r + 16;
          return (
            <line
              key={i}
              x1={ri * Math.cos(rad)}
              y1={ri * Math.sin(rad)}
              x2={ro * Math.cos(rad)}
              y2={ro * Math.sin(rad)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
          );
        })}
        {/* phase arcs */}
        {segments.map((s, i) => (
          <motion.path
            key={i}
            d={arc(s.from, s.to)}
            fill="none"
            stroke={s.color}
            strokeWidth="26"
            strokeLinecap="round"
            opacity={prediction.hasData ? 0.92 : 0.35}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        {/* ovulation highlight marker */}
        {prediction.hasData && (
          <circle
            cx={r * Math.cos((angleFor(ovDay) * Math.PI) / 180)}
            cy={r * Math.sin((angleFor(ovDay) * Math.PI) / 180)}
            r="4"
            fill="#fff"
            opacity="0.95"
          />
        )}
        {/* today needle */}
        {markerAngle !== null && (
          <>
            <line
              x1={needleInner * Math.cos(markerRad)}
              y1={needleInner * Math.sin(markerRad)}
              x2={(r - 14) * Math.cos(markerRad)}
              y2={(r - 14) * Math.sin(markerRad)}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <motion.circle
              cx={markerX}
              cy={markerY}
              r="8"
              fill="#fff"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.6 }}
              style={{
                filter: "drop-shadow(0 0 10px rgba(255,255,255,0.7))",
              }}
            />
          </>
        )}
      </svg>

      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {prediction.hasData && prediction.currentDay ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint">
              today is
            </p>
            <p className="font-display text-rose-glow text-6xl font-medium leading-none text-ink">
              {prediction.currentDay > L ? `${L}+` : prediction.currentDay}
            </p>
            <p
              className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: phase ? PHASE_META[phase].color : "#999" }}
            >
              {phase ? PHASE_META[phase].label : "—"}
            </p>
            <p className="mt-2 max-w-[10rem] text-[10px] leading-relaxed text-ink-faint">
              {prediction.daysUntilPeriod !== null && prediction.daysUntilPeriod < 0
                ? `${Math.abs(prediction.daysUntilPeriod)}d later than expected`
                : prediction.daysUntilPeriod === 0
                  ? "period expected today"
                  : `period in ~${prediction.daysUntilPeriod} days`}
            </p>
          </>
        ) : (
          <>
            <Droplets className="mb-1 h-5 w-5 text-rose-400/70" />
            <p className="font-display text-2xl italic text-ink">
              no cycles yet
            </p>
            <p className="mt-1 max-w-[11rem] text-[10px] leading-relaxed text-ink-faint">
              log her last period start below and the wheel wakes up
            </p>
          </>
        )}
      </div>
    </div>
  );
}
