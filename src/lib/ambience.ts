// Sound for the hideaway.
//
// The ambience is built from many tiny scheduled events rather than a single
// looping hiss — that's what makes rain sound like real drops hitting glass
// and a fire sound like a fire instead of static.

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";

export class Ambience {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;


  private el: HTMLAudioElement | null = null;
  private elSource: MediaElementAudioSourceNode | null = null;
  private keepAlive: HTMLAudioElement | null = null;

  private musicVol = 0.75;

  mode: "off" | "upload" = "off";
  currentUploadId: string | null = null;
  onUploadEnd: (() => void) | null = null;

  /** Must run inside a real tap so iOS lets us make sound. */
  unlock(): boolean {
    if (typeof window === "undefined") return false;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicVol;
        this.musicBus.connect(this.ctx.destination);

      }
      if (this.ctx.state === "suspended") void this.ctx.resume();

      if (!this.keepAlive) {
        const a = new Audio(SILENT_WAV);
        a.loop = true;
        a.volume = 0.001;
        a.setAttribute("playsinline", "true");
        void a.play().catch(() => undefined);
        this.keepAlive = a;
      }
      return true;
    } catch {
      return false;
    }
  }

  setMusicVolume(v: number) {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicBus && this.ctx)
      this.musicBus.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.08);
    if (this.el) this.el.volume = this.musicVol;
  }

  playUpload(blob: Blob, id: string) {
    if (!this.unlock()) return;
    this.stopUpload();
    const ctx = this.ctx!;
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    el.volume = this.musicVol;
    el.setAttribute("playsinline", "true");
    el.onended = () => {
      this.mode = "off";
      this.currentUploadId = null;
      this.onUploadEnd?.();
    };
    try {
      this.elSource = ctx.createMediaElementSource(el);
      this.elSource.connect(this.musicBus!);
    } catch {
      this.elSource = null;
    }
    void el.play().catch(() => undefined);
    this.el = el;
    this.currentUploadId = id;
    this.mode = "upload";
  }

  private stopUpload() {
    if (this.el) {
      this.el.onended = null;
      this.el.pause();
      if (this.el.src.startsWith("blob:")) URL.revokeObjectURL(this.el.src);
      this.el = null;
    }
    this.elSource?.disconnect();
    this.elSource = null;
    this.currentUploadId = null;
  }

  stopMusic() {
    this.stopUpload();
    this.mode = "off";
  }

  dispose() {
    this.stopMusic();
    this.keepAlive?.pause();
    this.keepAlive = null;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
