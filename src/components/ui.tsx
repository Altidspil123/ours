"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.35em] text-rose-300/70",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function PageTitle({
  eyebrow,
  children,
  hint,
}: {
  eyebrow: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-6">
      <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
      <h1 className="font-display text-4xl italic leading-[1.05] text-ink sm:text-5xl">
        {children}
      </h1>
      {hint && <p className="mt-2 text-sm text-ink-dim">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint/50 outline-none transition focus:border-rose-400/50 focus:bg-white/[0.08]";

export const btnPrimaryCls =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 bg-[length:200%_100%] px-5 py-2.5 text-sm font-medium text-white shadow-glow-rose transition-all hover:bg-[position:100%_0] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";

export const btnGhostCls =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-ink-dim transition-colors hover:border-white/25 hover:text-ink active:scale-[0.98]";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal
            className="glass-strong relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] p-6 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.9)] sm:rounded-[2rem]"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-2xl italic text-ink">{title}</h3>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-ink-dim transition-colors hover:border-rose-400/40 hover:text-rose-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EmptyNote({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-rose-400/20 bg-rose-400/10 text-rose-300">
        {icon}
      </div>
      <p className="font-display text-xl italic text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-dim">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
