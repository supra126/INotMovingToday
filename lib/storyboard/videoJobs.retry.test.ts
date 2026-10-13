import { beforeEach, describe, expect, it, vi } from "vitest";

const drafts = vi.hoisted(() => ({ next: null as null | (() => Promise<unknown>) }));
vi.mock("@/services/videoService", () => ({
  composePrompt: async () => "prompt",
  draftPrompt: () => (drafts.next ? drafts.next() : Promise.reject(new Error("no draft queued"))),
}));
// Plain functions: vitest flags errors thrown by vi.fn implementations even when the caller handles them
const job = vi.hoisted(() => ({ attempts: [] as (() => Promise<unknown>)[] }));
vi.mock("@/lib/video/job", () => ({
  runVideoJob: () => {
    const next = job.attempts.shift();
    return next ? next() : Promise.reject(new Error("no attempt queued"));
  },
  runExtendJob: () => {
    const next = job.attempts.shift();
    return next ? next() : Promise.reject(new Error("no attempt queued"));
  },
}));
import { newProject, toShot } from "./shots";
import type { StoryboardProject } from "./types";
import { draftShotFields, extendShotVideo, generateShotVideos } from "./videoJobs";

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

describe("code review fixes", () => {
  beforeEach(() => {
    job.attempts = [];
    drafts.next = null;
  });

  it("records the frames a video was made from", async () => {
    job.attempts = [async () => done];
    const h = harness(project());
    const start = h.get().shots[0].finalImage!.blob;
    await generateShotVideos(h.ctx, h.get(), ["s01"], "zh", { retryDelayMs: 0 });
    expect(h.get().shots[0].video?.startFrame).toBe(start);
  });

  it("drops a field draft that finishes after the frame changed", async () => {
    const draft = {
      summary: "",
      fields: Object.fromEntries(["subject", "setting", "camera", "lighting", "sound"].map((k) => [k, { value: "old", options: [] }])),
    };
    let release: () => void = () => {};
    drafts.next = () => new Promise((resolve) => (release = () => resolve(draft)));
    const h = harness({ ...project(), shots: project().shots.map((s) => ({ ...s, fields: undefined })) });
    const running = draftShotFields(h.ctx, h.get(), "zh");
    await new Promise((r) => setTimeout(r, 0));
    // The user picks a different frame while the draft is in flight
    h.ctx.update((p) => ({
      ...p,
      shots: p.shots.map((s) => ({ ...s, finalImage: { blob: new Blob(["new"]), mimeType: "image/png" }, draftStatus: undefined })),
    }));
    release();
    await running;
    expect(h.get().shots[0].fields).toBeUndefined();
    expect(h.get().shots[0].draft).toBeUndefined();
  });

  it("clears an earlier error when an extension succeeds", async () => {
    job.attempts = [async () => ({ videoUrl: "data:video/mp4;base64,AAAA", sourceVideoUri: "interaction-2" })];
    const h = harness(
      project({ status: "completed", progress: 100, prompt: "p", duration: 4, blob: new Blob(["v"]), sourceVideoUri: "interaction-1", error: "errors.rateLimited" })
    );
    await extendShotVideo(h.ctx, h.get(), "s01", "more", 4);
    expect(h.get().shots[0].video?.error).toBeUndefined();
    expect(h.get().shots[0].video?.duration).toBe(8);
  });
});


describe("codex review", () => {
  it("records the settings a video was made with", async () => {
    job.attempts = [async () => done];
    const h = harness(project());
    await generateShotVideos(h.ctx, h.get(), ["s01"], "zh", { retryDelayMs: 0 });
    expect(h.get().shots[0].video?.made?.duration).toBe(h.get().shots[0].duration);
  });
});
