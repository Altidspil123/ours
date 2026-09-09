"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HeartHandshake, SendHorizontal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface Msg {
  id: number;
  profile: string;
  text: string;
  createdAt: string;
  pending?: boolean;
}

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

export function ChatRoom({
  profile,
  meName,
  partnerName,
  initial,
}: {
  profile: Profile;
  meName: string;
  partnerName: string;
  initial: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(initial.length ? initial[initial.length - 1].id : 0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const listWrapRef = useRef<HTMLDivElement>(null);

  // Track whether the user is near the bottom (for smart auto-scroll).
  useEffect(() => {
    const onScroll = () => {
      const threshold = 180;
      nearBottomRef.current =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - threshold;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Poll for new messages.
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/messages?since=${lastIdRef.current}`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: Msg[] };
        if (!data.messages.length) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m) => !known.has(m.id));
          if (!fresh.length) return prev;
          lastIdRef.current = Math.max(...fresh.map((m) => m.id));
          return [...prev, ...fresh];
        });
        if (nearBottomRef.current) {
          requestAnimationFrame(() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          );
        }
      } catch {
        /* offline — try again next tick */
      }
    };
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, []);

  // Initial scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic: Msg = {
      id: -Date.now(),
      profile,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
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

  const remove = async (id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/messages?id=${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  };

  const grouped = useMemo(() => {
    const out: Array<{ type: "sep"; label: string; key: string } | { type: "msg"; msg: Msg; key: string }> = [];
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

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      {/* header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-rose-300/70">
            whispers
          </p>
          <h1 className="font-display mt-1 text-3xl italic text-ink sm:text-4xl">
            Between you &amp; {partnerName}
          </h1>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-ink-faint sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
          end-to-end-ish: just us two
        </div>
      </div>

      {/* messages */}
      <div ref={listWrapRef} className="flex-1 space-y-1 pb-6">
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
              <div
                key={row.key}
                className="flex items-center gap-3 py-4"
              >
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-ink-faint">
                  {row.label}
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
            ) : (
              <Bubble
                key={row.key}
                msg={row.msg}
                own={row.msg.profile === profile}
                senderName={row.msg.profile === "him" ? undefined : partnerName}
                onDelete={() => remove(row.msg.id)}
              />
            ),
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* composer */}
      <div className="sticky bottom-24 z-30 pb-1 pt-2">
        <div className="glass-strong flex items-center gap-2 rounded-full py-1.5 pl-5 pr-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Something for ${partnerName}…`}
            maxLength={2000}
            className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-ink-faint/60 outline-none"
          />
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
      </div>
    </div>
  );
}

function Bubble({
  msg,
  own,
  senderName,
  onDelete,
}: {
  msg: Msg;
  own: boolean;
  senderName?: string;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group flex", own ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[80%] sm:max-w-[70%]", own ? "text-right" : "text-left")}>
        <div
          className={cn(
            "relative inline-block whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-left text-sm leading-relaxed",
            own
              ? "rounded-br-lg bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_30px_-12px_rgba(229,109,138,0.55)]"
              : "glass rounded-bl-lg text-ink",
            msg.pending && "opacity-60",
          )}
        >
          {msg.text}
          {own && !msg.pending && (
            <button
              onClick={onDelete}
              aria-label="Delete message"
              className="absolute -left-8 top-1/2 -translate-y-1/2 text-ink-faint opacity-0 transition-opacity hover:text-rose-400 focus:opacity-100 group-hover:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1 px-2 text-[10px] text-ink-faint/70">
          {!own && senderName ? `${senderName} · ` : ""}
          {fmtTime(msg.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}
