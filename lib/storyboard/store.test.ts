import { describe, expect, it } from "vitest";
import { newProject, toShot } from "./shots";
import { createProjectStore, type ProjectStorage } from "./store";
import type { ProjectSummary, StoryboardProject } from "./types";

function memoryStorage(delayMs = 0) {
  const data = new Map<string, StoryboardProject>();
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const storage: ProjectStorage = {
    list: async () =>
      [...data.values()].map(({ id, name, updatedAt, step }): ProjectSummary => ({ id, name, updatedAt, step })),
    load: async (id) => {
      await wait();
      return data.get(id);
    },
    save: async (p) => {
      data.set(p.id, p);
    },
    remove: async (id) => {
      data.delete(id);
    },
  };
  return { data, storage };
}

const withVideo = (id: string): StoryboardProject => {
  const p = newProject(id, 0);
  p.shots = [
    {
      ...toShot({ id: "s01", seconds: 4, visual: "v", camera: "", sound: "", music: "無", onScreenText: "", transition: "", hasPackaging: false }, true),
      video: { status: "generating", progress: 10, prompt: "", duration: 4 },
    },
  ];
  return p;
};

let n = 0;
const options = { saveDelay: 5, newId: () => `new-${++n}` };

describe("project store", () => {
  it("applies updates that arrive while the project is still loading", async () => {
    const { data, storage } = memoryStorage(20);
    data.set("a", newProject("a", 0));
    const store = createProjectStore(storage, options);
    store.open("a");
    store.update("a", (p) => ({ ...p, name: "renamed" }));
    await new Promise((r) => setTimeout(r, 40));
    expect(store.getSnapshot().project?.name).toBe("renamed");
    await store.flush();
    expect(data.get("a")?.name).toBe("renamed");
  });

  it("persists updates for a project that is no longer open", async () => {
    const { data, storage } = memoryStorage();
    data.set("a", newProject("a", 0));
    data.set("b", newProject("b", 0));
    const store = createProjectStore(storage, options);
    store.open("a");
    await new Promise((r) => setTimeout(r, 5));
    store.open("b");
    store.update("a", (p) => ({ ...p, name: "late result" }));
    await store.flush();
    expect(data.get("a")?.name).toBe("late result");
    expect(store.getSnapshot().project?.id).toBe("b");
  });

  it("keeps in-memory-only updates out of storage until something persists", async () => {
    const { data, storage } = memoryStorage();
    data.set("a", newProject("a", 0));
    const store = createProjectStore(storage, options);
    store.open("a");
    await new Promise((r) => setTimeout(r, 5));
    store.update("a", (p) => ({ ...p, tone: "progress" }), { persist: false });
    await new Promise((r) => setTimeout(r, 20));
    expect(data.get("a")?.tone).toBe("");
    await store.flush();
    expect(data.get("a")?.tone).toBe("progress");
  });

  it("does not mark running work as interrupted when reopening within the session", async () => {
    const { data, storage } = memoryStorage();
    data.set("a", newProject("a", 0));
    data.set("b", newProject("b", 0));
    const store = createProjectStore(storage, options);
    store.open("a");
    await new Promise((r) => setTimeout(r, 5));
    store.update("a", () => withVideo("a"));
    store.open("b");
    await new Promise((r) => setTimeout(r, 5));
    store.open("a");
    expect(store.getSnapshot().project?.shots[0].video?.status).toBe("generating");
  });

  it("marks running work as interrupted after a reload", async () => {
    const { data, storage } = memoryStorage();
    data.set("a", withVideo("a"));
    const store = createProjectStore(storage, options);
    store.open("a");
    await new Promise((r) => setTimeout(r, 5));
    expect(store.getSnapshot().project?.shots[0].video?.status).toBe("interrupted");
  });
});
