"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Ellipsis,
  Film,
  LogOut,
  Music4,
  Plus,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Ambience } from "@/lib/ambience";
import {
  BUILT_IN,
  loadCustomScenes,
  parseVideoId,
  saveCustomScenes,
  type Scene,
} from "@/lib/scenes";
import {
  addSong,
  listSongs,
  removeSong,
  type StoredSong,
} from "@/lib/song-store";

const LS_KEY = "ours_hideaway_v2";

interface YTPlayer {
  playVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (v: number) => void;
  loadVideoById: (o: { videoId: string }) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YTPlayer;
size?: unknown;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

function Slider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 px-1 py-1.5">
      {value === 0 ? (
        <VolumeX className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
      ) : (
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
      )}
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-1 w-full cursor-pointer appearance-none rounded-full accent-rose-400 outline-none [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-rose-300 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-300 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(238,147,168,0.7)]"
        style={{
          background: `linear-gradient(to right, rgba(238,147,168,0.85) ${value * 100}%, rgba(255,255,255,0.13) ${value * 100}%)`,
        }}
      />
    </label>
  );
}

export function Hideaway() {
  const router = useRouter();
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const engineRef = useRef<Ambience | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scenes, setScenes] = useState<Scene[]>(BUILT_IN);
  const [sceneId, setSceneId] = useState(BUILT_IN[0].id);
  const [ready, setReady] = useState(false);
  const [needsTap, setNeedsTap] = useState(true);
  const [panel, setPanel] = useState(false);
  const [dim, setDim] = useState(false);

  const [musicVol, setMusicVol] = useState(0.7);
  const [ambVol, setAmbVol] = useState(0.65);

  const [songs, setSongs] = useState<StoredSong[]>([]);
  const [nowPlaying, setNowPlaying] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];

  // ── restore saved bits ───────────────────────────────────────────────────
  useEffect(() => {
    const eng = new Ambience();
    eng.onUploadEnd = () => setNowPlaying("");
    engineRef.current = eng;
    void listSongs().then(setSongs);

    const custom = loadCustomScenes();
    const all = [...BUILT_IN, ...custom];
    setScenes(all);
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as {
          sceneId?: string;
          musicVol?: number;
          ambVol?: number;
        };
        if (s.sceneId && all.some((x) => x.id === s.sceneId)) setSceneId(s.sceneId);
        if (typeof s.musicVol === "number") setMusicVol(s.musicVol);
        if (typeof s.ambVol === "number") setAmbVol(s.ambVol);
      }
    } catch {
      /* first visit */
    }
    return () => {
      eng.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ sceneId, musicVol, ambVol }));
    } catch {
      /* private mode */
    }
  }, [sceneId, musicVol, ambVol]);

  // ── the video background ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !holderRef.current || playerRef.current) return;
      playerRef.current = new window.YT!.Player(holderRef.current, {
        videoId: scene.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          loop: 1,
          playlist: scene.videoId,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          mute: 1, // browsers only allow muted autoplay
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(Math.round(ambVol * 100));
            e.target.playVideo();
            setReady(true);
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            if (e.data === 0) e.target.playVideo(); // loop safety net
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // swap the clip when the scene changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    p.loadVideoById({ videoId: scene.videoId });
    p.setVolume(Math.round(ambVol * 100));
    if (!needsTap) p.unMute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.videoId]);

  useEffect(() => {
    playerRef.current?.setVolume(Math.round(ambVol * 100));
  }, [ambVol]);

  useEffect(() => {
    engineRef.current?.setMusicVolume(musicVol);
  }, [musicVol]);

  /** Browsers need one real tap before sound is allowed. */
  const wakeSound = useCallback(() => {
    if (!needsTap) return;
    const p = playerRef.current;
    if (p) {
      p.unMute();
      p.setVolume(Math.round(ambVol * 100));
      p.playVideo();
    }
    engineRef.current?.unlock();
    setNeedsTap(false);
  }, [needsTap, ambVol]);

  // ── your songs ───────────────────────────────────────────────────────────
  const playSong = useCallback(
    (song: StoredSong) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (nowPlaying === song.name) {
        eng.stopMusic();
        setNowPlaying("");
        return;
      }
      eng.playUpload(song.blob, song.id);
      eng.setMusicVolume(musicVol);
      setNowPlaying(song.name);
    },
    [musicVol, nowPlaying],
  );

  const upload = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const saved = await addSong(file);
    if (saved) setSongs((prev) => [...prev, saved]);
    setUploading(false);
  }, []);

  const deleteSong = useCallback(
    async (song: StoredSong) => {
      if (nowPlaying === song.name) {
        engineRef.current?.stopMusic();
        setNowPlaying("");
      }
      await removeSong(song.id);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      setConfirmDel(null);
    },
    [nowPlaying],
  );

  // ── your own backgrounds ─────────────────────────────────────────────────
  const addScene = useCallback(() => {
    const id = parseVideoId(linkDraft);
    if (!id) {
      setLinkError("That doesn't look like a YouTube link.");
      return;
    }
    const fresh: Scene = {
      id: `c-${Date.now()}`,
      name: nameDraft.trim().slice(0, 28) || "Our scene",
      videoId: id,
    };
    const custom = [...loadCustomScenes(), fresh];
    saveCustomScenes(custom);
    setScenes([...BUILT_IN, ...custom]);
    setSceneId(fresh.id);
    setLinkDraft("");
    setNameDraft("");
    setLinkError(null);
    setAddOpen(false);
  }, [linkDraft, nameDraft]);

  const deleteScene = useCallback(
    (id: string) => {
      const custom = loadCustomScenes().filter((s) => s.id !== id);
      saveCustomScenes(custom);
      const all = [...BUILT_IN, ...custom];
      setScenes(all);
      if (sceneId === id) setSceneId(all[0].id);
    },
    [sceneId],
  );

  const leave = useCallback(() => {
    engineRef.current?.stopMusic();
    playerRef.current?.mute();
    router.push("/");
  }, [router]);

  // fade the "…" away when you're just watching
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setDim(false);
      clearTimeout(timer);
      timer = setTimeout(() => setDim(true), 4000);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden bg-black"
      onPointerDown={wakeSound}
    >
      {/* the video, blown up so it always covers the screen */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[max(100vh,56.25vw)] w-[max(100vw,177.78vh)] -translate-x-1/2 -translate-y-1/2">
          <div ref={holderRef} className="h-full w-full" />
        </div>
      </div>

      {/* gentle darkening so the controls stay readable */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center">
          <motion.span
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="font-display text-lg italic text-ink/60"
          >
            settling in…
          </motion.span>
        </div>
      )}

      {/* first-tap prompt for sound */}
      <AnimatePresence>
        {ready && needsTap && !panel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-[16%] flex justify-center"
          >
            <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-dim backdrop-blur-md">
              tap anywhere for sound
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setPanel(true)}
        animate={{ opacity: panel ? 0 : dim ? 0.22 : 0.8 }}
        transition={{ duration: 0.6 }}
        aria-label="Open the quiet menu"
        className="absolute right-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/35 text-ink-dim backdrop-blur-md transition-colors hover:text-ink"
      >
        <Ellipsis className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {panel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanel(false)}
              className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-4 bottom-5 z-40 mx-auto max-h-[86vh] max-w-sm overflow-y-auto rounded-[1.75rem] border border-white/10 p-4 shadow-[0_28px_70px_-18px_rgba(0,0,0,0.95)]"
              style={{
                background:
                  "linear-gradient(150deg, rgba(18,12,24,0.95), rgba(12,8,16,0.97))",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* backgrounds */}
              <p className="mb-2 px-1 text-[9px] font-medium uppercase tracking-[0.28em] text-ink-faint">
                the view
              </p>
              <div className="mb-2 space-y-1">
                {scenes.map((s) => {
                  const on = s.id === sceneId;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
                        on ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                      )}
                    >
                      <button
                        onClick={() => setSceneId(s.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <Film
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            on ? "text-rose-300" : "text-ink-faint",
                          )}
                        />
                        <span className="truncate text-xs text-ink">{s.name}</span>
                      </button>
                      {on && (
                        <span className="h-1.5 w-1.5 shrink-0 animate-pulse-soft rounded-full bg-rose-400" />
                      )}
                      {!s.builtIn && (
                        <button
                          onClick={() => deleteScene(s.id)}
                          aria-label={`Remove ${s.name}`}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {addOpen ? (
                <div className="mb-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <input
                    autoFocus
                    value={linkDraft}
                    onChange={(e) => {
                      setLinkDraft(e.target.value);
                      setLinkError(null);
                    }}
                    placeholder="paste a YouTube link"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink outline-none focus:border-rose-400/50"
                  />
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="name it (optional)"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink outline-none focus:border-rose-400/50"
                  />
                  {linkError && (
                    <p className="text-[10px] text-rose-400">{linkError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setAddOpen(false);
                        setLinkError(null);
                      }}
                      className="flex-1 rounded-lg border border-white/10 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-faint"
                    >
                      cancel
                    </button>
                    <button
                      onClick={addScene}
                      className="flex-1 rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 py-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white"
                    >
                      add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddOpen(true)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-[11px] text-ink-faint transition-colors hover:border-rose-400/40 hover:text-ink-dim"
                >
                  <Plus className="h-3.5 w-3.5" /> add a background from YouTube
                </button>
              )}

              {/* mixers */}
              <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] py-1">
                <Slider label="ambience" value={ambVol} onChange={setAmbVol} />
                <Slider label="music" value={musicVol} onChange={setMusicVol} />
              </div>

              {/* your songs */}
              <div className="mb-2 space-y-1 border-t border-white/[0.06] pt-2">
                <p className="px-1 pb-1 text-[9px] uppercase tracking-[0.2em] text-ink-faint/70">
                  ours {songs.length > 0 ? "· tap the bin to remove" : ""}
                </p>
                {songs.length === 0 && (
                  <p className="px-1 pb-1 text-[10px] text-ink-faint/60">
                    nothing here yet — add a song below and it stays on this phone
                  </p>
                )}
                {songs.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                      nowPlaying === s.name ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <button
                      onClick={() => playSong(s)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <Music4
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          nowPlaying === s.name ? "text-rose-300" : "text-ink-faint",
                        )}
                      />
                      <span className="truncate text-xs text-ink">{s.name}</span>
                    </button>
                    {nowPlaying === s.name && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse-soft rounded-full bg-rose-400" />
                    )}
                    {confirmDel === s.id ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => void deleteSong(s)}
                          className="rounded-full bg-rose-500/90 px-2 py-1 text-[10px] font-medium text-white"
                        >
                          remove
                        </button>
                        <button
                          onClick={() => setConfirmDel(null)}
                          className="px-1.5 text-[10px] text-ink-faint"
                        >
                          no
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(s.id)}
                        aria-label={`Remove ${s.name}`}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-[11px] text-ink-faint transition-colors hover:border-rose-400/40 hover:text-ink-dim"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "saving…" : "add a song of ours"}
              </button>

              <button
                onClick={leave}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-xs uppercase tracking-[0.18em] text-ink-dim transition-colors hover:border-rose-400/30 hover:text-ink"
              >
                <LogOut className="h-3.5 w-3.5" /> back to us
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
