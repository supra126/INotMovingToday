"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { newProject, normalizeOnLoad } from "@/lib/storyboard/shots";
import { deleteProject, listProjects, loadProject, saveProject } from "@/lib/storyboard/storage";
import type { ProjectSummary, StoryboardProject } from "@/lib/storyboard/types";

const LAST_PROJECT_KEY = "storyboard:lastProject";
const SAVE_DELAY = 500;

export type ProjectUpdater = (fn: (project: StoryboardProject) => StoryboardProject) => void;

export function useStoryboardProject() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<StoryboardProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const projectRef = useRef<StoryboardProject | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Writes to projects that are not open are applied in order, straight to IndexedDB
  const backgroundChain = useRef<Promise<void>>(Promise.resolve());

  const refreshList = useCallback(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (projectRef.current) saveProject(projectRef.current).then(refreshList).catch(() => {});
  }, [refreshList]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  }, [flush]);

  const show = useCallback((next: StoryboardProject | null) => {
    projectRef.current = next;
    setProject(next);
  }, []);

  const open = useCallback(
    (id: string) => {
      flush();
      setIsLoading(true);
      loadProject(id)
        .then((loaded) => {
          show(loaded ? normalizeOnLoad(loaded) : null);
          if (loaded) localStorage.setItem(LAST_PROJECT_KEY, id);
        })
        .finally(() => setIsLoading(false));
    },
    [flush, show]
  );

  const create = useCallback(() => {
    flush();
    const created = newProject(crypto.randomUUID(), Date.now());
    show(created);
    localStorage.setItem(LAST_PROJECT_KEY, created.id);
    saveProject(created).then(refreshList).catch(() => {});
  }, [flush, refreshList, show]);

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id);
      if (projectRef.current?.id === id) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        show(null);
        localStorage.removeItem(LAST_PROJECT_KEY);
      }
      refreshList();
    },
    [refreshList, show]
  );

  const update = useCallback(
    (projectId: string, fn: (p: StoryboardProject) => StoryboardProject) => {
      const current = projectRef.current;
      if (current?.id === projectId) {
        show({ ...fn(current), updatedAt: Date.now() });
        scheduleSave();
        return;
      }
      // A background job finished after the user switched projects
      backgroundChain.current = backgroundChain.current.then(async () => {
        const stored = await loadProject(projectId);
        if (stored) await saveProject({ ...fn(stored), updatedAt: Date.now() });
      }).catch(() => {});
    },
    [scheduleSave, show]
  );

  // Load the list and the last opened project once; state is only set in promise callbacks
  useEffect(() => {
    const last = localStorage.getItem(LAST_PROJECT_KEY);
    Promise.all([listProjects(), last ? loadProject(last) : Promise.resolve(undefined)])
      .then(([list, loaded]) => {
        setProjects(list);
        show(loaded ? normalizeOnLoad(loaded) : null);
      })
      .catch(() => setProjects([]))
      .finally(() => setIsLoading(false));

    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [flush, show]);

  return { projects, project, isLoading, open, create, remove, update };
}
