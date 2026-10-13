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

const SERVER_SNAPSHOT: StoreSnapshot = { projects: [], project: null, isLoading: true };

export function useStoryboardProject() {
  const projectStore = getStore();
  const snapshot = useSyncExternalStore(projectStore.subscribe, projectStore.getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    projectStore.init(localStorage.getItem(LAST_PROJECT_KEY));
    const flush = () => void projectStore.flush();
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [projectStore]);

  const open = useCallback(
    (id: string) => {
      localStorage.setItem(LAST_PROJECT_KEY, id);
      projectStore.open(id);
    },
    [projectStore]
  );

  const create = useCallback(() => {
    localStorage.setItem(LAST_PROJECT_KEY, projectStore.create().id);
  }, [projectStore]);

  const remove = useCallback(
    async (id: string) => {
      if (localStorage.getItem(LAST_PROJECT_KEY) === id) localStorage.removeItem(LAST_PROJECT_KEY);
      await projectStore.remove(id);
    },
    [projectStore]
  );

  const update = useCallback(
    (projectId: string, fn: (p: StoryboardProject) => StoryboardProject, options?: UpdateOptions) =>
      projectStore.update(projectId, fn, options),
    [projectStore]
  );

  return { ...snapshot, open, create, remove, update };
}
