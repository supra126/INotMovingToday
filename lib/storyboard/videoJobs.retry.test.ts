import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/videoService", () => ({
  composePrompt: vi.fn(async () => "prompt"),
  draftPrompt: vi.fn(),
}));
// Plain functions: vitest flags errors thrown by vi.fn implementations even when the caller handles them
const job = vi.hoisted(() => ({ attempts: [] as (() => Promise<unknown>)[] }));
vi.mock("@/lib/video/job", () => ({
  runVideoJob: () => {
    const next = job.attempts.shift();
    return next ? next() : Promise.reject(new Error("no attempt queued"));
  },
  runExtendJob: () => Promise.reject(new Error("not used")),
}));
import { newProject, toShot } from "./shots";
import type { StoryboardProject } from "./types";
import { generateShotVideos } from "./videoJobs";

const fields = { subject: "s", setting: "", camera: "", lighting: "", sound: "" };

function project(video?: StoryboardProject["shots"][number]["video"]): StoryboardProject {
  const p = newProject("p", 0);
  p.shots = [
    {
      ...toShot({ id: "s01", seconds: 4, visual: "v", camera: "", sound: "", music: "無", onScreenText: "", transition: "", hasPackaging: false }, true),
      finalImage: { blob: new Blob(["img"]), mimeType: "image/png" },
      fields,
      video,
    },
  ];
  return p;
}

function harness(initial: StoryboardProject) {
  let state = initial;
  const statuses: string[] = [];
  const ctx = {
    projectId: "p",
    apiKey: "k",
    update: (fn: (p: StoryboardProject) => StoryboardProject) => {
      state = fn(state);
      statuses.push(state.shots[0].video?.status ?? "none");
    },
  };
  return { ctx, statuses, get: () => state };
}

const done = { videoUrl: "data:video/mp4;base64,AAAA", sourceVideoUri: "interaction-1" };

describe("generateShotVideos", () => {
  beforeEach(() => {
    job.attempts = [];
  });

  it("never shows a rate-limited shot as failed while it is being retried", async () => {
    job.attempts = [
      async () => {
        throw Object.assign(new Error("Too many requests"), { status: 429 });
      },
      async () => done,
    ];
    const h = harness(project());
    await generateShotVideos(h.ctx, h.get(), ["s01"], "zh", { retryDelayMs: 0 });
    expect(h.statuses).not.toContain("failed");
    expect(h.get().shots[0].video?.status).toBe("completed");
    expect(h.get().shots[0].video?.blob).toBeInstanceOf(Blob);
  });

  it("keeps the previous video when a regeneration fails", async () => {
    job.attempts = [
      async () => {
        throw new Error("boom");
      },
    ];
    const previousBlob = new Blob(["old video"]);
    const h = harness(project({ status: "completed", progress: 100, prompt: "old", duration: 4, blob: previousBlob }));
    await generateShotVideos(h.ctx, h.get(), ["s01"], "zh", { retryDelayMs: 0 });
    const video = h.get().shots[0].video;
    expect(video?.status).toBe("completed");
    expect(video?.blob).toBe(previousBlob);
    expect(video?.error).toBe("boom");
  });

  it("marks a first-time failure as failed", async () => {
    job.attempts = [
      async () => {
        throw new Error("boom");
      },
    ];
    const h = harness(project());
    await generateShotVideos(h.ctx, h.get(), ["s01"], "zh", { retryDelayMs: 0 });
    expect(h.get().shots[0].video?.status).toBe("failed");
  });
});
