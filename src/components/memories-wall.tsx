"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Images, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <PageTitle eyebrow={`${memories.length} kept ${memories.length === 1 ? "moment" : "moments"}`}>
          Proof it all happened
        </PageTitle>
        <button onClick={() => setOpen(true)} className={cn(btnPrimaryCls, "mb-6 shrink-0")}>
          <Plus className="h-4 w-4" /> Pin a moment
        </button>
      </div>

      {memories.length === 0 ? (
        <EmptyNote
          icon={<Images className="h-5 w-5" />}
          title="The wall is bare."
          body="Pin the first photo of you two — the messy ones are the best ones."
          action={
            <button onClick={() => setOpen(true)} className={btnPrimaryCls}>
              <Camera className="h-4 w-4" /> Add the first memory
            </button>
          }
        />
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 [&>figure]:mb-3">
          <AnimatePresence>
            {memories.map((m, i) => (
              <motion.figure
                key={m.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
                className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-white/10"
              >
                <img
                  src={m.imageUrl}
                  alt={m.caption || "memory"}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-plum-950/85 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {m.caption && (
                    <p className="font-display text-sm italic leading-snug text-ink">
                      “{m.caption}”
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-ink-dim">
                    {m.takenOn
                      ? new Date(`${m.takenOn}T00:00:00`).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "undated"}{" "}
                    · by {m.createdBy === profile ? meName : partnerName}
                  </p>
                </figcaption>
                <button
                  onClick={() => remove(m.id)}
                  className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-ink-dim opacity-0 backdrop-blur transition-all hover:text-rose-400 group-hover:opacity-100"
                  aria-label="Remove memory"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.figure>
            ))}
          </AnimatePresence>
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
  const [error, setError] = useState<string | null>(null);

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
      setImageUrl("");
      setCaption("");
      setTakenOn("");
      await onSaved();
    } else {
      setError("That link doesn't look right — it should start with https://");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pin a moment">
      <div className="space-y-4">
        <Field label="Photo url">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
        {imageUrl.trim() && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <img src={imageUrl} alt="preview" className="max-h-48 w-full object-cover" />
          </div>
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
          disabled={!imageUrl.trim() || busy}
          className={cn(btnPrimaryCls, "w-full")}
        >
          {busy ? "Pinning…" : "Pin it forever"}
        </button>
      </div>
    </Modal>
  );
}
