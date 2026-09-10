// Backgrounds are YouTube videos shown through YouTube's official embed
// player — nothing is downloaded or re-hosted, so creators keep their views.

export interface Scene {
  id: string;
  name: string;
  videoId: string;
  builtIn?: boolean;
}

export const BUILT_IN: Scene[] = [
  {
    id: "fireplace",
    name: "Fireplace",
    videoId: "cuPPcx9KRVw",
    builtIn: true,
  },
];

const LS_SCENES = "ours_scenes_v2";

/** Pull the video id out of any normal YouTube link. */
export function parseVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // already just an id
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1, 12);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* not a url */
  }
  return null;
}

export function loadCustomScenes(): Scene[] {
  try {
    const raw = localStorage.getItem(LS_SCENES);
    if (!raw) return [];
    const list = JSON.parse(raw) as Scene[];
    return Array.isArray(list) ? list.filter((s) => s.videoId && s.name) : [];
  } catch {
    return [];
  }
}

export function saveCustomScenes(list: Scene[]) {
  try {
    localStorage.setItem(LS_SCENES, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}
