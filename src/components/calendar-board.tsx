"use client";

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { EVENT_COLORS, type Profile } from "@/lib/types";
import { iso } from "@/lib/cycle";
import {
  Field,
  Modal,
  PageTitle,
  btnPrimaryCls,
  btnGhostCls,
  inputCls,
} from "@/components/ui";

export interface EventItemDTO {
  id: number;
  text: string;
  done: boolean;
}

export interface EventDTO {
  id: number;
  title: string;
  date: string;
  time: string | null;
  notes: string;
  color: string;
  createdBy: string;
  items: EventItemDTO[];
}

interface PredictionDTO {
  hasData: boolean;
  predictedStarts: string[];
  periodLength: number;
  fertileWindows: { start: string; end: string; ovulation: string }[];
  daysUntilPeriod: number | null;
  nextPeriodStart: string | null;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const COLOR_KEYS = ["rose", "gold", "violet", "aqua"] as const;

export function CalendarBoard({
  profile,
  meName,
  partnerName,
  events: initialEvents,
  prediction,
}: {
  profile: Profile;
  meName: string;
  partnerName: string;
  events: EventDTO[];
  prediction: PredictionDTO;
}) {
  const todayIso = iso(new Date());
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayIso);
  const [events, setEvents] = useState(initialEvents);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EventDTO | null>(null);

  const refetch = async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) return;
      const data = (await res.json()) as { events: EventDTO[] };
      setEvents(data.events);
    } catch {
      /* keep local */
    }
  };

  // ── cycle overlays ─────────────────────────────────────────────────────────
  const { periodDays, fertileDays, ovulationDays } = useMemo(() => {
    const periodDays = new Set<string>();
    const fertileDays = new Set<string>();
    const ovulationDays = new Set<string>();
    if (prediction.hasData) {
      for (const start of prediction.predictedStarts) {
        for (let i = 0; i < prediction.periodLength; i++) {
          periodDays.add(iso(addDays(parseISO(start), i)));
        }
      }
      for (const w of prediction.fertileWindows) {
        for (const d of eachDayOfInterval({ start: parseISO(w.start), end: parseISO(w.end) })) {
          fertileDays.add(iso(d));
        }
        ovulationDays.add(w.ovulation);
      }
    }
    return { periodDays, fertileDays, ovulationDays };
  }, [prediction]);

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      }),
    [cursor],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, EventDTO[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? "24:00").localeCompare(b.time ?? "24:00"));
    }
    return map;
  }, [events]);

  const selectedEvents = byDay.get(selected) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle eyebrow="ours to plan">Two calendars, one life</PageTitle>
        {prediction.hasData && (
          <div className="glass mb-6 flex items-center gap-2 rounded-full px-4 py-2 text-xs">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-rose-500" />
            <span className="text-ink-dim">
              {prediction.daysUntilPeriod !== null && prediction.daysUntilPeriod < 0
                ? `period ~${Math.abs(prediction.daysUntilPeriod)}d later than expected`
                : prediction.daysUntilPeriod === 0
                  ? "period expected today"
                  : `next period in ~${prediction.daysUntilPeriod}d`}
            </span>
          </div>
        )}
      </div>

      {/* month header */}
      <div className="glass mb-2 flex items-center justify-between rounded-t-[1.75rem] rounded-b-lg px-4 py-3">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-dim transition-colors hover:bg-white/10 hover:text-ink"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setCursor(startOfMonth(new Date()));
            setSelected(todayIso);
          }}
          className="group text-center"
        >
          <p className="font-display text-2xl italic leading-none text-ink transition-colors group-hover:text-rose-300">
            {format(cursor, "MMMM")}
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink-faint">
            {format(cursor, "yyyy")}
          </p>
        </button>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-dim transition-colors hover:bg-white/10 hover:text-ink"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* grid */}
      <div className="glass rounded-b-[1.75rem] rounded-t-lg p-2 sm:p-3">
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const key = iso(day);
            const inMonth = isSameMonth(day, cursor);
            const isSel = key === selected;
            const isNow = isToday(day);
            const dayEvents = byDay.get(key) ?? [];
            const isPeriod = periodDays.has(key);
            const isFertile = fertileDays.has(key) && !isPeriod;
            const isOvulation = ovulationDays.has(key);

            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={cn(
                  "group relative flex min-h-[3.4rem] flex-col items-center justify-start rounded-xl pt-1.5 transition-all sm:min-h-[4rem]",
                  !inMonth && "opacity-30",
                  isSel
                    ? "bg-rose-400/15 ring-1 ring-rose-400/50"
                    : "hover:bg-white/[0.05]",
                  isPeriod && !isSel && "bg-rose-500/[0.07]",
                )}
              >
                <span className="relative">
                  <span
                    className={cn(
                      "text-sm leading-none",
                      isNow ? "font-semibold text-rose-300" : "text-ink-dim group-hover:text-ink",
                      isSel && "text-ink",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {isNow && (
                    <span className="absolute -inset-1.5 -z-10 rounded-full ring-1 ring-rose-400/40" />
                  )}
                </span>

                {/* markers */}
                <span className="mt-auto flex h-4 items-center justify-center gap-1 pb-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: EVENT_COLORS[e.color] ?? "#f0738f" }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] leading-none text-ink-faint">+</span>
                  )}
                  {isOvulation && (
                    <Heart
                      className="h-2.5 w-2.5 fill-lav-400 text-lav-400"
                      aria-label="Ovulation"
                    />
                  )}
                  {isFertile && !isOvulation && (
                    <span className="h-1 w-1 rounded-full bg-lav-400/80" aria-label="Fertile window" />
                  )}
                </span>
                {isPeriod && (
                  <span className="pointer-events-none absolute inset-x-1.5 bottom-0.5 h-0.5 rounded-full bg-rose-500/50" />
                )}
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 px-2 pt-3 pb-1">
          <Legend swatch={<span className="h-1.5 w-1.5 rounded-full bg-rose-400" />} label="event" />
          <Legend swatch={<span className="inline-block h-2 w-4 rounded-full bg-rose-500/50" />} label="expected period" />
          <Legend swatch={<span className="h-1 w-1 rounded-full bg-lav-400" />} label="fertile" />
          <Legend swatch={<Heart className="h-2.5 w-2.5 fill-lav-400 text-lav-400" />} label="ovulation" />
        </div>
      </div>

      {/* selected day panel */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint">
              {parseISO(selected).toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <h2 className="font-display text-3xl italic text-ink">
              {parseISO(selected).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
              })}
            </h2>
          </div>
          <button onClick={() => setAddOpen(true)} className={btnPrimaryCls}>
            <CalendarPlus className="h-4 w-4" /> Plan something
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="glass rounded-3xl px-6 py-10 text-center">
            <p className="font-display text-xl italic text-ink-dim">
              A completely open {parseISO(selected).toLocaleDateString(undefined, { weekday: "long" })}…
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              dangerous territory, {meName}. Fill it with something.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {selectedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  createdByName={event.createdBy === profile ? meName : partnerName}
                  onChanged={refetch}
                  onEdit={() => setEditing(event)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <EventFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={refetch}
        initialDate={selected}
      />
      <EventFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={refetch}
        existing={editing}
        initialDate={selected}
      />
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
      {swatch}
      {label}
    </span>
  );
}

/* ── event card with checklist ─────────────────────────────────────────────── */
function EventCard({
  event,
  createdByName,
  onChanged,
  onEdit,
}: {
  event: EventDTO;
  createdByName: string;
  onChanged: () => Promise<void>;
  onEdit: () => void;
}) {
  const color = EVENT_COLORS[event.color] ?? EVENT_COLORS.rose;
  const [itemDraft, setItemDraft] = useState("");
  const [busyItem, setBusyItem] = useState(false);

  const doneCount = event.items.filter((i) => i.done).length;

  const toggle = async (item: EventItemDTO) => {
    await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, done: !item.done }),
    }).catch(() => undefined);
    await onChanged();
  };

  const addItem = async () => {
    const text = itemDraft.trim();
    if (!text || busyItem) return;
    setBusyItem(true);
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, text }),
    }).catch(() => undefined);
    setItemDraft("");
    setBusyItem(false);
    await onChanged();
  };

  const removeItem = async (id: number) => {
    await fetch(`/api/items?id=${id}`, { method: "DELETE" }).catch(() => undefined);
    await onChanged();
  };

  const removeEvent = async () => {
    await fetch(`/api/events/${event.id}`, { method: "DELETE" }).catch(() => undefined);
    await onChanged();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass overflow-hidden rounded-3xl"
    >
      <div className="flex">
        <span className="w-1.5 shrink-0" style={{ background: color }} />
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl italic leading-tight text-ink">
                {event.title}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                <span style={{ color }}>
                  {event.time ?? "any time"}
                </span>
                <span>added by {createdByName}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={onEdit}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-white/10 hover:text-gold-300"
                aria-label="Edit event"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={removeEvent}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-white/10 hover:text-rose-400"
                aria-label="Delete event"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {event.notes && (
            <p className="mt-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-ink-dim">
              {event.notes}
            </p>
          )}

          {/* checklist */}
          <div className="mt-4">
            {event.items.length > 0 && (
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                <span>before the day</span>
                <span>
                  {doneCount}/{event.items.length} done
                </span>
              </div>
            )}
            <ul className="space-y-1">
              {event.items.map((item) => (
                <li key={item.id} className="group flex items-center gap-2.5">
                  <button
                    onClick={() => toggle(item)}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all",
                      item.done
                        ? "border-transparent"
                        : "border-white/25 hover:border-white/60",
                    )}
                    style={item.done ? { background: color } : undefined}
                    aria-label={item.done ? "Uncheck" : "Check"}
                  >
                    {item.done && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm transition-colors",
                      item.done ? "text-ink-faint line-through" : "text-ink-dim",
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-ink-faint opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-70"
                    aria-label="Remove item"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <input
                value={itemDraft}
                onChange={(e) => setItemDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="Add a to-do — candles, playlist, her favorite wine…"
                maxLength={200}
                className="w-full bg-transparent py-1 text-sm text-ink placeholder:text-ink-faint/50 outline-none"
              />
            </div>
          </div>

          {event.items.length > 0 && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={false}
                animate={{ width: `${(doneCount / event.items.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 28 }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── add / edit form ───────────────────────────────────────────────────────── */
function EventFormModal({
  open,
  onClose,
  onSaved,
  existing,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  existing?: EventDTO | null;
  initialDate: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("");
  const [color, setColor] = useState<string>("rose");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<EventDTO | null>(null);

  // Prefill when editing changes.
  if (existing && existing !== loadedFor) {
    setLoadedFor(existing);
    setTitle(existing.title);
    setDate(existing.date);
    setTime(existing.time ?? "");
    setColor(existing.color);
    setNotes(existing.notes);
  }
  if (!existing && loadedFor) {
    setLoadedFor(null);
    setTitle("");
    setTime("");
    setColor("rose");
    setNotes("");
  }
  if (!existing && date !== initialDate && !loadedFor && open) {
    setDate(initialDate);
  }

  const save = async () => {
    if (!title.trim() || !date || busy) return;
    setBusy(true);
    const payload = { title: title.trim(), date, time: time || null, color, notes: notes.trim() };
    try {
      const res = existing
        ? await fetch(`/api/events/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        onClose();
        await onSaved();
        if (!existing) {
          setTitle("");
          setTime("");
          setNotes("");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Tweak the plan" : "Plan something together"}
    >
      <div className="space-y-4">
        <Field label="What are we doing?">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Anniversary dinner, weekend escape, movie night…"
            maxLength={120}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Time (optional)">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Mood color">
          <div className="flex gap-2">
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-9 flex-1 rounded-xl transition-all",
                  color === c ? "scale-[1.03] ring-2 ring-white/50" : "opacity-60 hover:opacity-100",
                )}
                style={{ background: `linear-gradient(135deg, ${EVENT_COLORS[c]}, ${EVENT_COLORS[c]}88)` }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Book the corner table, wear the blue thing, keep it a secret…"
            rows={3}
            maxLength={1000}
            className={cn(inputCls, "resize-none")}
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={!title.trim() || !date || busy}
            className={cn(btnPrimaryCls, "flex-1")}
          >
            {busy ? "Saving…" : existing ? "Save changes" : "Add to our calendar"}
          </button>
          <button onClick={onClose} className={btnGhostCls}>
            Later
          </button>
        </div>
      </div>
    </Modal>
  );
}
