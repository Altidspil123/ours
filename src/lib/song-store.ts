// Tiny IndexedDB wrapper for songs you upload yourself.
// Songs live on the device that uploaded them (they're never sent anywhere).

export interface StoredSong {
  id: string;
  name: string;
  blob: Blob;
}

const DB = "ours_songs";
const STORE = "songs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSongs(): Promise<StoredSong[]> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as StoredSong[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function addSong(file: File): Promise<StoredSong | null> {
  try {
    const db = await open();
    const song: StoredSong = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name.replace(/\.[^.]+$/, "").slice(0, 60),
      blob: file,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(song);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return song;
  } catch {
    return null;
  }
}

export async function removeSong(id: string): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}
