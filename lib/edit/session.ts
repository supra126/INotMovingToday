import type { VideoRatio, VideoResolution } from "@/types";

/** One result in the edit history; version 0 is the clip as uploaded */
export interface EditVersion {
  blob: Blob;
  /** The instruction that made it (empty for the original) */
  prompt: string;
  at: number;
}

/** The video being edited in the edit mode, kept in IndexedDB so a reload does not lose it */
export interface EditSession {
  /** File name of the upload, for downloads */
  name: string;
  ratio: VideoRatio;
  resolution: VideoResolution;
  versions: EditVersion[];
  /** Version shown and edited next */
  current: number;
}

const DB_NAME = "jola-edit";
const STORE = "session";
const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSession(): Promise<EditSession | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as EditSession | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

/** Save, or clear with null; resolves once the write is committed */
export async function saveSession(session: EditSession | null): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    if (session) tx.objectStore(STORE).put(session, KEY);
    else tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Omni edits clips of 10 seconds or less */
export const MAX_EDIT_SECONDS = 10;

export function ratioOf(width: number, height: number): VideoRatio {
  return height > width ? "9:16" : "16:9";
}
