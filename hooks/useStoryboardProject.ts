"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createProjectStore, type ProjectStore, type StoreSnapshot, type UpdateOptions } from "@/lib/storyboard/store";
import { deleteProject, listProjects, loadProject, saveProject } from "@/lib/storyboard/storage";
import type { StoryboardProject } from "@/lib/storyboard/types";

const LAST_PROJECT_KEY = "storyboard:lastProject";

export type ProjectUpdater = (
  fn: (project: StoryboardProject) => StoryboardProject,
  options?: UpdateOptions
) => void;

// One store per browser tab, so jobs keep their project after the page unmounts
let store: ProjectStore | null = null;
function getStore(): ProjectStore {
  store ??= createProjectStore({ list: listProjects, load: loadProject, save: saveProject, remove: deleteProject });
  return store;
}

const SERVER_SNAPSHOT: StoreSnapshot = { projects: [], project: null, isLoading: true, saveError: null };

/**
 * The shared project store. `lastKey` remembers which project this page reopens, so the
 * frame-sequence page and the storyboard page each come back to their own project.
 */
export function useStoryboardProject(lastKey: string = LAST_PROJECT_KEY) {
  const projectStore = getStore();
  const snapshot = useSyncExternalStore(projectStore.subscribe, projectStore.getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    const lastId = localStorage.getItem(lastKey);
    projectStore.init(lastId);
    // The store is shared by the tab: another page may have opened a different project
    if (lastId && projectStore.getSnapshot().project?.id !== lastId) projectStore.open(lastId);
    const flush = () => void projectStore.flush();
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [projectStore, lastKey]);

  const open = useCallback(
    (id: string) => {
      localStorage.setItem(lastKey, id);
      projectStore.open(id);
    },
    [projectStore, lastKey]
  );

  const create = useCallback(() => {
    const project = projectStore.create();
    localStorage.setItem(lastKey, project.id);
    return project;
  }, [projectStore, lastKey]);

  const remove = useCallback(
    async (id: string) => {
      if (localStorage.getItem(lastKey) === id) localStorage.removeItem(lastKey);
      await projectStore.remove(id);
    },
    [projectStore, lastKey]
  );

  const update = useCallback(
    (projectId: string, fn: (p: StoryboardProject) => StoryboardProject, options?: UpdateOptions) =>
      projectStore.update(projectId, fn, options),
    [projectStore]
  );

  return { ...snapshot, open, create, remove, update };
}
