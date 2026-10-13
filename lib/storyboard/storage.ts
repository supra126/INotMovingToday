import type { ProjectSummary, StoryboardProject } from "./types";

const DB_NAME = "jola-storyboard";
const STORE = "projects";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    // A write only counts once the transaction commits: quota errors surface there, not on the request
    if (mode === "readwrite") {
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? request.error);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const all = await run<StoryboardProject[]>("readonly", (store) => store.getAll());
  return all
    .map(({ id, name, updatedAt, step }) => ({ id, name, updatedAt, step }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadProject(id: string): Promise<StoryboardProject | undefined> {
  return run<StoryboardProject | undefined>("readonly", (store) => store.get(id));
}

export async function saveProject(project: StoryboardProject): Promise<void> {
  await run("readwrite", (store) => store.put(project));
}

export async function deleteProject(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}
