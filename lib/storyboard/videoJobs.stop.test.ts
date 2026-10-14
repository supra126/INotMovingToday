import { beforeEach, describe, expect, it, vi } from "vitest";

const svc = vi.hoisted(() => ({ cancelled: [] as string[], fail: false }));
vi.mock("@/services/videoService", () => ({
  composePrompt: async () => "prompt",
  draftPrompt: async () => { throw new Error("unused"); },
  cancelVideoGeneration: async (jobId: string) => {
    svc.cancelled.push(jobId);
    if (svc.fail) throw new Error("503 unavailable");
  },
}));
// Each started job gets an id and waits until the test releases it
const job = vi.hoisted(() => ({ started: [] as string[], release: new Map<string, () => void>() }));
vi.mock("@/lib/video/job", () => ({
  runVideoJob: async (_input: unknown, hooks: { isCancelled: () => boolean; onJobId?: (id: string) => void }) => {
    if (hooks.isCancelled()) return null;
    const id = `job-${job.started.length + 1}`;
    job.started.push(id);
    hooks.onJobId?.(id);
    await new Promise<void>((resolve) => job.release.set(id, resolve));
    return hooks.isCancelled() ? null : { videoUrl: "data:video/mp4;base64,AAAA", sourceVideoUri: id };
  },
  runExtendJob: async () => null,
}));
import { newProject, toShot } from "./shots";
import type { ShotVideo, StoryboardProject } from "./types";
import { generateShotVideos, stopShotVideos } from "./videoJobs";

const fields = { subject: "s", setting: "", camera: "", lighting: "", sound: "" };
const tick = () => new Promise((r) => setTimeout(r, 0));

function project(count: number, video?: ShotVideo): StoryboardProject {
  const p = newProject("p", 0);
  p.shots = Array.from({ length: count }, (_, i) => ({
    ...toShot({ id: `s0${i + 1}`, seconds: 4, visual: "v", camera: "", sound: "", music: "無", onScreenText: "", transition: "", hasPackaging: false }, i === count - 1),
    finalImage: { blob: new Blob([`img${i}`]), mimeType: "image/png" },
    fields,
    video,
  }));
  return p;
}

function harness(initial: StoryboardProject) {
  let state = initial;
  const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => { state = fn(state); } };
  return { ctx, get: () => state, status: (id: string) => state.shots.find((s) => s.id === id)?.video?.status };
}

describe("stopShotVideos", () => {
  beforeEach(() => {
    job.started = [];
    job.release.clear();
    svc.cancelled = [];
    svc.fail = false;
  });

  it("never sends a queued shot once it is stopped", async () => {
    const h = harness(project(4));
    const running = generateShotVideos(h.ctx, h.get(), ["s01", "s02", "s03", "s04"], "zh");
    await tick();
    expect(job.started).toHaveLength(3);
    stopShotVideos(h.ctx, ["s04"]);
    job.release.forEach((release) => release());
    await running;
    expect(job.started).toHaveLength(3);
    expect(h.status("s04")).toBe("stopped");
    expect(h.status("s01")).toBe("completed");
  });

  it("asks Google to cancel a running shot and keeps it stopped", async () => {
    const h = harness(project(1));
    const running = generateShotVideos(h.ctx, h.get(), ["s01"], "zh");
    await tick();
    stopShotVideos(h.ctx, ["s01"]);
    expect(svc.cancelled).toEqual(["job-1"]);
    expect(h.status("s01")).toBe("stopped");
    job.release.get("job-1")!();
    await running;
    expect(h.status("s01")).toBe("stopped");
  });

  it("brings back the earlier video when a regeneration is stopped", async () => {
    const before: ShotVideo = { status: "completed", progress: 100, prompt: "old", duration: 4, blob: new Blob(["v"]) };
    const h = harness(project(1, before));
    const running = generateShotVideos(h.ctx, h.get(), ["s01"], "zh");
    await tick();
    stopShotVideos(h.ctx, ["s01"]);
    job.release.get("job-1")!();
    await running;
    expect(h.get().shots[0].video).toMatchObject({ status: "completed", prompt: "old" });
  });

  it("stays stopped when Stop lands while the finished video downloads", async () => {
    let releaseFetch: () => void = () => {};
    vi.stubGlobal("fetch", () => new Promise((resolve) => (releaseFetch = () => resolve(new Response(new Blob(["v"]))))));
    const h = harness(project(1));
    const running = generateShotVideos(h.ctx, h.get(), ["s01"], "zh");
    await tick();
    job.release.get("job-1")!();
    await tick();
    stopShotVideos(h.ctx, ["s01"]);
    releaseFetch();
    await running;
    vi.unstubAllGlobals();
    expect(h.status("s01")).toBe("stopped");
  });

  it("says so when Google could not cancel a running shot", async () => {
    svc.fail = true;
    const h = harness(project(1));
    const running = generateShotVideos(h.ctx, h.get(), ["s01"], "zh");
    await tick();
    stopShotVideos(h.ctx, ["s01"]);
    await tick();
    expect(h.get().shots[0].video).toMatchObject({ status: "stopped", error: "errors.cancelFailed" });
    job.release.get("job-1")!();
    await running;
  });
});
