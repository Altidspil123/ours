"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Images, ImageUp, Link2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import {
  Field,
  Modal,
  EmptyNote,
  PageTitle,
  btnPrimaryCls,
  inputCls,
} from "@/components/ui";

/** Shrink a photo from the gallery so it stores and loads fast. */
async function fileToCompressedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = dataUrl;
  });

  const MAX = 1600;
  let { width, height } = img;
  if (width > MAX || height > MAX) {
    const scale = MAX / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  // Step the quality down until it comfortably fits in the database.
  for (const q of [0.82, 0.7, 0.6, 0.5]) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (out.length <= 4_000_000) return out;
  }
  return canvas.toDataURL("image/jpeg", 0.4);
}

export interface MemoryDTO {
  id: number;
  imageUrl: string;
  caption: string;
  takenOn: string | null;
  createdBy: string;
}

export function MemoriesWall({
  profile,
  meName,
  partnerName,
  initial,
}: {
  profile: Profile;
  meName: string;
  partnerName: string;
  initial: MemoryDTO[];
}) {
  const [memories, setMemories] = useState(initial);
  const [open, setOpen] = useState(false);

  // Opening the wall counts as seeing everything on it — clears the badge.
  useEffect(() => {
    const seen = () =>
      fetch("/api/memories/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => undefined);
    void seen();
    const onVis = () => {
      if (document.visibilityState === "visible") void seen();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [memories.length]);

  const refetch = async () => {
    try {
      const res = await fetch("/api/memories");
      if (!res.ok) return;
      const data = (await res.json()) as { memories: MemoryDTO[] };
      setMemories(data.memories);
    } catch {
      /* keep local */
    }
  };

  const remove = async (id: number) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/memories?id=${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  };

  // group memories by month, newest first — the spine of the timeline
  const groups = (() => {
    const map = new Map<string, MemoryDTO[]>();
    const sorted = [...memories].sort((x, y) => {
      const dx = x.takenOn ?? "";
      const dy = y.takenOn ?? "";
      if (dx && dy) return dx < dy ? 1 : -1;
      if (dx) return -1;
      if (dy) return 1;
      return y.id - x.id;
    });
    for (const m of sorted) {
      const key = m.takenOn ? m.takenOn.slice(0, 7) : "undated";
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.entries()];
  })();

  const monthLabel = (key: string) => {
    if (key === "undated") return "Somewhere in time";
    const d = new Date(`${key}-01T00:00:00`);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <PageTitle
          eyebrow={`${memories.length} kept ${memories.length === 1 ? "moment" : "moments"}`}
        >
          Our story, in pieces
        </PageTitle>
        <button
          onClick={() => setOpen(true)}
          className={cn(btnPrimaryCls, "mb-6 shrink-0")}
        >
          <Plus className="h-4 w-4" /> Pin a moment
        </button>
      </div>

      {memories.length === 0 ? (
        <EmptyNote
          icon={<Images className="h-5 w-5" />}
          title="The story starts here."
          body="Pin the first photo of you two — the messy ones are the best ones."
          action={
            <button onClick={() => setOpen(true)} className={btnPrimaryCls}>
              <Camera className="h-4 w-4" /> Add the first memory
            </button>
          }
        />
      ) : (
        <div className="relative pb-6">
          {/* the thread running through everything */}
          <div
            aria-hidden
            className="absolute bottom-0 left-[13px] top-2 w-px sm:left-[15px]"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(238,147,168,0.35) 6%, rgba(238,147,168,0.28) 88%, transparent)",
            }}
          />

          {groups.map(([key, items], gi) => (
            <div key={key} className="relative">
              {/* month marker */}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex items-center gap-3 py-5"
              >
                <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-rose-400/40 bg-plum-950">
                  <span className="h-2 w-2 rounded-full bg-rose-400 shadow-glow-rose" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xl italic leading-none text-ink">
                    {monthLabel(key)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                    {items.length} {items.length === 1 ? "moment" : "moments"}
                  </p>
                </div>
              </motion.div>

              {/* the moments in that month */}
              <div className="space-y-4 pb-3 pl-11 sm:pl-12">
                {items.map((m, i) => (
                  <motion.figure
                    key={m.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: 0.5,
                      delay: Math.min(i * 0.06, 0.3),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group relative"
                  >
                    {/* little branch off the thread */}
                    <span
                      aria-hidden
                      className="absolute -left-[22px] top-8 h-px w-[18px] bg-gradient-to-r from-rose-400/35 to-transparent sm:-left-[23px]"
                    />
                    <div className="glass overflow-hidden rounded-[1.5rem] transition-colors group-hover:border-white/20">
                      <div className="relative">
                        <img
                          src={m.imageUrl}
                          alt={m.caption || "memory"}
                          className="max-h-[26rem] w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-plum-950/80 via-transparent to-transparent" />
                        <button
                          onClick={() => remove(m.id)}
                          className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-ink-dim opacity-0 backdrop-blur transition-all hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
                          aria-label="Remove memory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {m.caption && (
                          <figcaption className="absolute inset-x-0 bottom-0 p-4">
                            <p className="font-display text-lg italic leading-snug text-ink drop-shadow">
                              “{m.caption}”
                            </p>
                          </figcaption>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <p className="text-[11px] text-ink-faint">
                          {m.takenOn
                            ? new Date(`${m.takenOn}T00:00:00`).toLocaleDateString(
                                undefined,
                                { weekday: "long", day: "numeric", month: "long" },
                              )
                            : "an undated day"}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                          <span
                            className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-semibold text-white"
                            style={{
                              background:
                                m.createdBy === profile
                                  ? "linear-gradient(140deg,#e56d8a,#cf4f71)"
                                  : "linear-gradient(140deg,#6bc7c6,#b48ce2)",
                            }}
                          >
                            {(m.createdBy === profile ? meName : partnerName)
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          {m.createdBy === profile ? meName : partnerName}
                        </p>
                      </div>
                    </div>
                  </motion.figure>
                ))}
              </div>

              {gi === groups.length - 1 && (
                <div className="relative flex items-center gap-3 pt-4">
                  <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-plum-950">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-faint/60" />
                  </span>
                  <p className="font-display text-sm italic text-ink-faint">
                    where it all began
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddMemoryModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}

function AddMemoryModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImageUrl("");
    setCaption("");
    setTakenOn("");
    setLinkMode(false);
    setError(null);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't a photo.");
      return;
    }
    setError(null);
    setPreparing(true);
    try {
      const compressed = await fileToCompressedDataUrl(file);
      setImageUrl(compressed);
      // Use the photo's own date when the phone provides one.
      if (!takenOn && file.lastModified) {
        const d = new Date(file.lastModified);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1990) {
          setTakenOn(d.toISOString().slice(0, 10));
        }
      }
    } catch {
      setError("Couldn't read that photo — try another one.");
    }
    setPreparing(false);
  };

  const save = async () => {
    if (!imageUrl.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: imageUrl.trim(),
        caption: caption.trim(),
        takenOn: takenOn || undefined,
      }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      onClose();
      reset();
      await onSaved();
    } else {
      setError(
        linkMode
          ? "That link doesn't look right — it should start with https://"
          : "That photo was too large to save. Try a different one.",
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Pin a moment"
    >
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {imageUrl ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="preview"
              className="max-h-56 w-full object-cover"
            />
            <button
              onClick={() => setImageUrl("")}
              aria-label="Remove photo"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-ink-dim backdrop-blur transition-colors hover:text-rose-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={preparing}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-9 text-center transition-colors hover:border-rose-400/40 hover:bg-white/[0.05]"
          >
            {preparing ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                  className="block h-5 w-5 rounded-full border-2 border-rose-300/40 border-t-rose-300"
                />
                <span className="text-sm text-ink-dim">Preparing your photo…</span>
              </>
            ) : (
              <>
                <ImageUp className="h-6 w-6 text-rose-300" />
                <span className="text-sm text-ink">Choose a photo</span>
                <span className="text-[11px] text-ink-faint">
                  straight from your gallery or camera
                </span>
              </>
            )}
          </button>
        )}

        {!imageUrl && !preparing && (
          <button
            onClick={() => setLinkMode((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink-dim"
          >
            <Link2 className="h-3 w-3" />
            {linkMode ? "hide link box" : "or paste a link instead"}
          </button>
        )}

        {linkMode && !imageUrl && (
          <Field label="Photo url">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>
        )}

        <Field label="Caption">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="the night you stole my fries and my heart"
            maxLength={300}
            className={inputCls}
          />
        </Field>
        <Field label="Date (optional)">
          <input
            type="date"
            value={takenOn}
            onChange={(e) => setTakenOn(e.target.value)}
            className={inputCls}
          />
        </Field>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button
          onClick={save}
          disabled={!imageUrl.trim() || busy || preparing}
          className={cn(btnPrimaryCls, "w-full")}
        >
          {busy ? "Pinning…" : "Pin it forever"}
        </button>
      </div>
    </Modal>
  );
}
