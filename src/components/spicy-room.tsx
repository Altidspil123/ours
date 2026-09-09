"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Flame,
  History,
  ImagePlus,
  Pencil,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { INTENSITY_META, type Profile } from "@/lib/types";
import {
  Eyebrow,
  Field,
  Modal,
  btnGhostCls,
  btnPrimaryCls,
  inputCls,
} from "@/components/ui";

export interface SpicyCardDTO {
  id: number;
  title: string;
  body: string;
  intensity: number;
  imageUrl: string | null;
}

interface DrawDTO {
  id: number;
  title: string;
  intensity: number;
  drawnBy: string;
  createdAt: string;
}

const FILTERS = [
  { value: 0, label: "Anything" },
  { value: 1, label: "Sweet" },
  { value: 2, label: "Warm" },
  { value: 3, label: "Hot" },
];

export function SpicyRoom({
  profile,
  meName,
  partnerName,
  cards: initialCards,
  draws: initialDraws,
}: {
  profile: Profile;
  meName: string;
  partnerName: string;
  cards: SpicyCardDTO[];
  draws: DrawDTO[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [draws, setDraws] = useState(initialDraws);
  const [filter, setFilter] = useState(0);
  const [current, setCurrent] = useState<SpicyCardDTO | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [burst, setBurst] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);
  const exhaustedRef = useRef<Set<number>>(new Set());

  const pool = useMemo(
    () => (filter === 0 ? cards : cards.filter((c) => c.intensity === filter)),
    [cards, filter],
  );

  const syncAll = async () => {
    try {
      const res = await fetch("/api/spicy");
      if (!res.ok) return;
      const data = (await res.json()) as {
        cards: SpicyCardDTO[];
        draws: DrawDTO[];
      };
      setCards(data.cards);
      setDraws(data.draws);
    } catch {
      /* keep local state */
    }
  };

  const draw = async () => {
    if (drawing || pool.length === 0) return;
    setDrawing(true);

    let candidates = pool.filter((c) => !exhaustedRef.current.has(c.id));
    if (candidates.length === 0) {
      exhaustedRef.current = new Set();
      candidates = pool;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    exhaustedRef.current.add(pick.id);

    // Let the deck "shuffle" before the reveal.
    await new Promise((r) => setTimeout(r, 650));
    setCurrent(pick);
    setBurst((b) => b + 1);
    setDrawing(false);

    fetch("/api/spicy/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: pick.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.draw) {
          setDraws((prev) =>
            [
              {
                id: d.draw.id,
                title: pick.title,
                intensity: pick.intensity,
                drawnBy: profile,
                createdAt: d.draw.createdAt,
              },
              ...prev,
            ].slice(0, 8),
          );
        }
      })
      .catch(() => undefined);
  };

  const meta = current ? INTENSITY_META[current.intensity] : null;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <Eyebrow className="mb-2">the deck · for two</Eyebrow>
          <h1 className="font-display text-4xl italic text-ink sm:text-5xl">
            Ordinary nights <span className="not-italic text-rose-300">are banned.</span>
          </h1>
        </div>
        <button
          onClick={() => setManageOpen(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-ink-dim transition-colors hover:border-rose-400/40 hover:text-rose-300"
          aria-label="Manage deck"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-6 text-sm text-ink-dim">
        Draw a card. Do what it says. No negotiations, {meName}.
      </p>

      {/* intensity filter */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const color = f.value === 0 ? "#ee93a8" : INTENSITY_META[f.value].color;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-transparent text-white"
                  : "border-white/10 bg-white/[0.03] text-ink-faint hover:text-ink-dim",
              )}
              style={active ? { background: color, boxShadow: `0 6px 20px -6px ${color}aa` } : undefined}
            >
              {f.label}
            </button>
          );
        })}
        <span className="ml-auto text-[11px] text-ink-faint">
          {pool.length} card{pool.length === 1 ? "" : "s"} in play
        </span>
      </div>

      {/* stage */}
      <div className="relative mx-auto h-[430px] max-w-md select-none" style={{ perspective: 1400 }}>
        {/* drawn-card aura */}
        {current && meta && (
          <div
            className="absolute inset-0 blur-3xl transition-colors duration-700"
            style={{ background: `radial-gradient(60% 55% at 50% 45%, ${meta.glow}, transparent 75%)` }}
          />
        )}

        <AnimatePresence mode="popLayout">
          {current ? (
            <RevealedCard key={current.id} card={current} />
          ) : (
            <motion.div
              key="deck"
              className="absolute inset-0"
              exit={{ rotateY: 90, opacity: 0, transition: { duration: 0.35 } }}
            >
              <DeckBacks drawing={drawing} onDraw={draw} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* heart burst */}
        <HeartBurst key={burst} active={burst > 0} />
      </div>

      {/* controls */}
      <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3">
        <button
          onClick={draw}
          disabled={drawing || pool.length === 0}
          className={cn(btnPrimaryCls, "px-8 py-3 text-base")}
        >
          {drawing ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
              >
                <Flame className="h-4 w-4" />
              </motion.span>
              Shuffling…
            </>
          ) : pool.length === 0 ? (
            "The deck is empty"
          ) : current ? (
            <>
              <Shuffle className="h-4 w-4" /> Draw again
            </>
          ) : (
            <>
              <Flame className="h-4 w-4" /> Draw a card
            </>
          )}
        </button>
        {current && (
          <button onClick={() => setCurrent(null)} className={btnGhostCls}>
            Back to deck
          </button>
        )}
      </div>

      {/* log of the night */}
      {draws.length > 0 && (
        <div className="mt-12">
          <div className="mb-3 flex items-center gap-2 text-ink-faint">
            <History className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-[0.3em]">
              lately drawn
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {draws.map((d) => (
              <div
                key={d.id}
                className="glass flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: INTENSITY_META[d.intensity]?.color ?? "#999" }}
                />
                <div>
                  <p className="max-w-[10rem] truncate text-xs font-medium text-ink">
                    {d.title}
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    by {d.drawnBy === profile ? meName : partnerName} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ManageDeck
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        cards={cards}
        onSync={syncAll}
        onLocalCards={setCards}
      />
    </div>
  );
}

/* ── Revealed card ─────────────────────────────────────────────────────────── */
function RevealedCard({ card }: { card: SpicyCardDTO }) {
  const meta = INTENSITY_META[card.intensity];
  return (
    <motion.div
      initial={{ rotateY: -95, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: 90, opacity: 0 }}
      transition={{ type: "spring", stiffness: 190, damping: 22 }}
      style={{ transformStyle: "preserve-3d" }}
      className="absolute inset-0"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/15 bg-plum-900 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
        {card.imageUrl ? (
          <>
            <img
              src={card.imageUrl}
              alt={card.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-plum-950 via-plum-950/55 to-transparent" />
          </>
        ) : (
          <>
            <img
              src="/img/deck.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 90% at 50% 0%, ${meta.glow}, transparent 55%), linear-gradient(to top, rgba(12,8,16,0.95), rgba(12,8,16,0.4))`,
              }}
            />
          </>
        )}

        <div className="absolute inset-0 flex flex-col justify-between p-7">
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
              style={{ background: meta.color }}
            >
              <Flame className="h-3 w-3" />
              {meta.label}
            </span>
            <span className="font-display text-lg italic text-ink-faint">n°{card.id}</span>
          </div>

          <div>
            <h2 className="font-display text-rose-glow text-4xl italic leading-tight text-ink">
              {card.title}
            </h2>
            {card.body && (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-dim">
                {card.body}
              </p>
            )}
            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint/80">
              now go — no take-backs
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Idle deck stack ───────────────────────────────────────────────────────── */
function DeckBacks({ drawing, onDraw }: { drawing: boolean; onDraw: () => void }) {
  return (
    <motion.button
      onClick={onDraw}
      whileTap={{ scale: 0.97 }}
      className="ring-focus relative block h-full w-full"
      aria-label="Draw a card"
    >
      {[-7, 0, 7].map((deg, i) => (
        <motion.div
          key={deg}
          className="absolute inset-0 overflow-hidden rounded-[2rem] border border-rose-300/20 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]"
          initial={false}
          animate={{
            rotate: drawing ? [deg, deg - 4, deg + 5, deg] : deg,
            y: drawing ? [0, -14, 4, 0] : 0,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ transformOrigin: "50% 120%", zIndex: i }}
        >
          <img
            src="/img/deck.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 via-transparent to-plum-950/70" />
          {i === 1 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Flame
                className={cn(
                  "h-10 w-10 text-rose-300 drop-shadow-[0_0_18px_rgba(229,109,138,0.9)]",
                  drawing && "animate-pulse",
                )}
              />
              <p className="font-display mt-3 text-2xl italic text-ink">
                {drawing ? "shuffling…" : "tap to tempt fate"}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-rose-300/70">
                the deck of us
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </motion.button>
  );
}

/* ── Heart burst particles ─────────────────────────────────────────────────── */
function HeartBurst({ active }: { active: boolean }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 260,
        delay: Math.random() * 0.25,
        size: 9 + Math.random() * 12,
        duration: 1 + Math.random() * 0.8,
      })),
    [],
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-visible">
      {parts.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -180 - Math.random() * 60, x: p.x, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          className="absolute bottom-8 text-rose-400"
          style={{ fontSize: 0 }}
        >
          <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.9-9.7-9.2C.7 8.9 2.4 5.3 5.8 4.6 7.7 4.2 9.6 5 10.7 6.5c.4.5.8 1.1 1.3 1.9.5-.8.9-1.4 1.3-1.9 1.1-1.5 3-2.3 4.9-1.9 3.4.7 5.1 4.3 3.5 7.2C19.5 16.1 12 21 12 21Z" />
          </svg>
        </motion.span>
      ))}
    </div>
  );
}

/* ── Deck management ───────────────────────────────────────────────────────── */
function ManageDeck({
  open,
  onClose,
  cards,
  onSync,
  onLocalCards,
}: {
  open: boolean;
  onClose: () => void;
  cards: SpicyCardDTO[];
  onSync: () => Promise<void>;
  onLocalCards: (c: SpicyCardDTO[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Tend the deck">
      <p className="mb-5 text-sm text-ink-dim">
        Add your own cards, or attach pictures to existing ones — they show up
        the moment a card is drawn.
      </p>

      <button
        onClick={() => setAdding((a) => !a)}
        className={cn(adding ? btnGhostCls : btnPrimaryCls, "mb-5 w-full")}
      >
        {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {adding ? "Cancel" : "Write a new card"}
      </button>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CardForm
              onSaved={async () => {
                setAdding(false);
                await onSync();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {cards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            onSynced={onSync}
            onDeleted={() => onLocalCards(cards.filter((c) => c.id !== card.id))}
          />
        ))}
        {cards.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            Empty deck. Write the first rule of the house.
          </p>
        )}
      </div>
    </Modal>
  );
}

function IntensityPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((v) => {
        const meta = INTENSITY_META[v];
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex-1 rounded-xl border py-2 text-xs font-medium transition-all",
              active
                ? "border-transparent text-white"
                : "border-white/10 bg-white/[0.03] text-ink-faint hover:text-ink",
            )}
            style={active ? { background: meta.color } : undefined}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function CardForm({
  initial,
  onSaved,
}: {
  initial?: SpicyCardDTO;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [intensity, setIntensity] = useState(initial?.intensity ?? 2);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    const payload = {
      title: title.trim(),
      body: body.trim(),
      intensity,
      imageUrl: imageUrl.trim() || null,
    };
    try {
      const res = initial
        ? await fetch(`/api/spicy?id=${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/spicy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, imageUrl: payload.imageUrl ?? undefined }),
          });
      if (res.ok) await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The kitchen rule"
          maxLength={120}
          className={inputCls}
        />
      </Field>
      <Field label="Instructions" className="mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What must be done when this card is drawn…"
          rows={3}
          maxLength={600}
          className={cn(inputCls, "resize-none")}
        />
      </Field>
      <Field label="Heat level" className="mt-3">
        <IntensityPicker value={intensity} onChange={setIntensity} />
      </Field>
      <Field label="Picture (optional url)" className="mt-3">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… or /img/myphoto.jpg"
            className={inputCls}
          />
        </div>
      </Field>
      <button
        onClick={save}
        disabled={!title.trim() || busy}
        className={cn(btnPrimaryCls, "mt-4 w-full")}
      >
        {busy ? "Saving…" : initial ? "Save changes" : "Add to the deck"}
      </button>
    </div>
  );
}

function CardRow({
  card,
  onSynced,
  onDeleted,
}: {
  card: SpicyCardDTO;
  onSynced: () => Promise<void>;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = INTENSITY_META[card.intensity];

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    onDeleted();
    await fetch(`/api/spicy?id=${card.id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    await onSynced();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: meta.color }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{card.title}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            {meta.label}
            {card.imageUrl ? " · has picture" : " · text only"}
          </p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-ink-faint transition-colors hover:text-gold-300"
          aria-label="Edit card"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={remove}
          className="text-ink-faint transition-colors hover:text-rose-400"
          aria-label="Delete card"
        >
          {deleting ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <CardForm
                initial={card}
                onSaved={async () => {
                  setEditing(false);
                  await onSynced();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
