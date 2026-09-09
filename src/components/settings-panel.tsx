"use client";

import { HeartHandshake, Lock, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import {
  Field,
  PageTitle,
  btnGhostCls,
  btnPrimaryCls,
  inputCls,
} from "@/components/ui";

export function SettingsPanel({
  couple,
}: {
  profile: Profile;
  couple: { himName: string; herName: string; anniversary: string | null };
}) {
  const router = useRouter();
  const [himName, setHimName] = useState(couple.himName);
  const [herName, setHerName] = useState(couple.herName);
  const [anniversary, setAnniversary] = useState(couple.anniversary ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    await fetch("/api/couple", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        himName: himName.trim() || couple.himName,
        herName: herName.trim() || couple.herName,
        anniversary: anniversary || null,
      }),
    }).catch(() => undefined);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  };

  const lock = async () => {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => undefined);
    router.replace("/unlock");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="settings"
        hint={`Everything here is shared between the two of you — save once, both see it.`}
      >
        The house rules
      </PageTitle>

      <div className="glass rounded-[2rem] p-6">
        <p className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint">
          <HeartHandshake className="h-3.5 w-3.5 text-rose-400" /> the two of you
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="His name">
            <input
              value={himName}
              onChange={(e) => setHimName(e.target.value)}
              maxLength={40}
              className={inputCls}
            />
          </Field>
          <Field label="Her name">
            <input
              value={herName}
              onChange={(e) => setHerName(e.target.value)}
              maxLength={40}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Anniversary — our day zero" className="mt-4">
          <input
            type="date"
            value={anniversary}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setAnniversary(e.target.value)}
            className={inputCls}
          />
        </Field>
        <button
          onClick={save}
          disabled={busy}
          className={cn(btnPrimaryCls, "mt-5 w-full sm:w-auto")}
        >
          <Save className="h-4 w-4" />
          {busy ? "Saving…" : saved ? "Saved — shared with both" : "Save changes"}
        </button>
      </div>

      <div className="glass rounded-[2rem] p-6">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-aqua-300" /> privacy
        </p>
        <p className="text-sm leading-relaxed text-ink-dim">
          The app is sealed behind your shared passcode. Whoever holds the code
          is one of you two — nobody else gets past the door.
        </p>
        <p className="mt-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-ink-faint">
          To change the code, set the{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-gold-300">APP_PASSCODE</code>{" "}
          environment variable where the app is hosted, then restart. The
          default is <code className="rounded bg-white/10 px-1.5 py-0.5 text-gold-300">forever</code>.
        </p>
        <button onClick={lock} className={cn(btnGhostCls, "mt-5")}>
          <Lock className="h-3.5 w-3.5" /> Lock the app now
        </button>
      </div>
    </div>
  );
}
