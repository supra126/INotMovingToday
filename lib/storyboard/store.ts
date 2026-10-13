import { newProject, normalizeOnLoad } from "./shots";
import type { ProjectSummary, StoryboardProject } from "./types";

export interface ProjectStorage {
  list(): Promise<ProjectSummary[]>;
  load(id: string): Promise<StoryboardProject | undefined>;
  save(project: StoryboardProject): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface StoreSnapshot {
  projects: ProjectSummary[];
  project: StoryboardProject | null;
  isLoading: boolean;
}

export interface UpdateOptions {
  /** false = keep in memory only (e.g. progress); saved with the next persisted change */
  persist?: boolean;
}

export interface ProjectStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): StoreSnapshot;
  init(lastId: string | null): void;
  open(id: string): void;
  create(): StoryboardProject;
  remove(id: string): Promise<void>;
  update(id: string, fn: (project: StoryboardProject) => StoryboardProject, options?: UpdateOptions): void;
  flush(): Promise<void>;
}

/**
 * One in-memory copy of every project touched in this session, shared by all pages.
 * Background jobs keep writing to it after the user switches projects or leaves the page,
 * and IndexedDB only sees debounced saves of that copy.
 */
export function createProjectStore(
  storage: ProjectStorage,
  options: { saveDelay?: number; now?: () => number; newId?: () => string } = {}
): ProjectStore {
  const { saveDelay = 500, now = Date.now, newId = () => crypto.randomUUID() } = options;

  const cache = new Map<string, StoryboardProject>();
  const loading = new Map<string, Promise<StoryboardProject | undefined>>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const dirty = new Set<string>();
  const listeners = new Set<() => void>();

  let initialized = false;
  let currentId: string | null = null;
  let projects: ProjectSummary[] = [];
  let isLoading = true;
  let snapshot: StoreSnapshot = { projects, project: null, isLoading };

  const emit = () => {
    snapshot = { projects, project: currentId ? cache.get(currentId) ?? null : null, isLoading };
    listeners.forEach((listener) => listener());
  };

  const refreshList = async () => {
    projects = await storage.list().catch(() => projects);
    projects = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
    emit();
  };

  // Work that was running when the page closed is reset only on the first load from storage
  const ensureLoaded = (id: string): Promise<StoryboardProject | undefined> => {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    let pending = loading.get(id);
    if (!pending) {
      pending = storage
        .load(id)
        .catch(() => undefined)
        .then((loaded) => {
          loading.delete(id);
          if (loaded && !cache.has(id)) cache.set(id, normalizeOnLoad(loaded));
          return cache.get(id);
        });
      loading.set(id, pending);
    }
    return pending;
  };

  const save = async (id: string) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    const project = cache.get(id);
    if (!project || !dirty.has(id)) return;
    dirty.delete(id);
    await storage.save(project);
    await refreshList();
  };

  const schedule = (id: string) => {
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => void save(id), saveDelay));
  };

  const open = (id: string) => {
    currentId = id;
    isLoading = !cache.has(id);
    emit();
    void ensureLoaded(id).then(() => {
      if (currentId !== id) return;
      isLoading = false;
      emit();
    });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,

    init(lastId) {
      if (initialized) return;
      initialized = true;
      void refreshList();
      if (lastId) {
        open(lastId);
      } else {
        isLoading = false;
        emit();
      }
    },

    open,

    create() {
      const project = newProject(newId(), now());
      cache.set(project.id, project);
      dirty.add(project.id);
      currentId = project.id;
      isLoading = false;
      emit();
      void save(project.id);
      return project;
    },

    async remove(id) {
      clearTimeout(timers.get(id));
      timers.delete(id);
      cache.delete(id);
      dirty.delete(id);
      await storage.remove(id);
      if (currentId === id) currentId = null;
      await refreshList();
    },

    update(id, fn, updateOptions = {}) {
      const apply = () => {
        const project = cache.get(id);
        if (!project) return;
        cache.set(id, { ...fn(project), updatedAt: now() });
        dirty.add(id);
        if (updateOptions.persist !== false) schedule(id);
        if (id === currentId) emit();
      };
      // Updates that arrive while a project is loading run in order once it is in memory
      if (cache.has(id)) apply();
      else void ensureLoaded(id).then(apply);
    },

    async flush() {
      await Promise.all([...loading.values()]);
      await Promise.all([...dirty].map((id) => save(id)));
    },
  };
}
