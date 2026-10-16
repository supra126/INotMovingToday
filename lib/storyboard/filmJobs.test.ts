import { beforeEach, describe, expect, it, vi } from "vitest";

const svc = vi.hoisted(() => ({ cancelled: [] as string[] }));
vi.mock("@/services/videoService", () => ({
  cancelVideoGeneration: async (jobId: string) => {
    svc.cancelled.push(jobId);
  },
}));
// Parts are labelled by the range kept; the film is the labels joined; a tail is labelled "tail(<film>)"
vi.mock("./clips", () => ({
  trimClip: async (_blob: Blob, range?: { from: number } | { last: number }) =>
    new Blob([!range ? "all" : "from" in range ? `from${range.from}` : `last${range.last}`]),
  tailClip: async (blob: Blob) => ({ blob: new Blob([`tail(${await blob.text()})`]), seconds: 5 }),
}));
vi.mock("./export", () => ({
  concatVideos: async (blobs: Blob[]) => new Blob([(await Promise.all(blobs.map((b) => b.text()))).join("+")]),
}));
vi.mock("@/lib/video/crop", () => ({ cropImageToRatio: async (blob: Blob) => `cropped:${await blob.text()}` }));
// Each started job records its input and waits until the test settles it
const job = vi.hoisted(() => ({
  calls: [] as { kind: "generate" | "extend"; input: Record<string, unknown> }[],
  settle: [] as ((outcome: "ok" | Error) => void)[],
}));
vi.mock("@/lib/video/job", () => {
  const start = (kind: "generate" | "extend") =>
    async (input: Record<string, unknown>, hooks: { isCancelled: () => boolean; onJobId?: (id: string) => void }) => {
      if (hooks.isCancelled()) return null;
      job.calls.push({ kind, input });
      const id = `job-${job.calls.length}`;
      hooks.onJobId?.(id);
      const outcome = await new Promise<"ok" | Error>((resolve) => job.settle.push(resolve));
      if (outcome instanceof Error) throw outcome;
      return hooks.isCancelled() ? null : { videoUrl: `data:video/mp4;base64,${btoa(id)}`, sourceVideoUri: id };
    };
  return { runVideoJob: start("generate"), runExtendJob: start("extend") };
});
import { canResumeFilm, generateFilm, resumeFilm, stopFilm } from "./filmJobs";
import { newProject, toShot } from "./shots";
import type { StoryboardProject } from "./types";

const tick = () => new Promise((r) => setTimeout(r, 0));
const options = { audioMode: "sfx" as const, withText: false, resolution: "1080p" as const };

function project(seconds: number[]): StoryboardProject {
  const p = newProject("p", 0);
  p.shots = seconds.map((s, i) => ({
    ...toShot({ id: `s0${i + 1}`, seconds: s, visual: "v", camera: "", sound: "", music: "", onScreenText: "", transition: "", hasPackaging: false }, i === seconds.length - 1),
    finalImage: { blob: new Blob([`img${i + 1}`]), mimeType: "image/png" },
  }));
  return p;
}

function harness(initial: StoryboardProject) {
  let state = initial;
  const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => { state = fn(state); } };
  return { ctx, get: () => state, film: () => state.film! };
}

// Let the latest job finish and the loop move on
async function finishNext(outcome: "ok" | Error = "ok") {
  await tick();
  job.settle.shift()!(outcome);
  await tick();
  await tick();
}

describe("generateFilm", () => {
  beforeEach(() => {
    job.calls = [];
    job.settle = [];
    svc.cancelled = [];
  });

  it("runs the segments in order and ends with the whole video", async () => {
    const p = project([5, 5, 6, 4, 8]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await finishNext();
    await running;

    expect(job.calls.map((c) => c.kind)).toEqual(["generate", "extend", "extend"]);
    expect(job.calls[0].input).toMatchObject({ duration: 10, resolution: "1080p" });
    expect(await (job.calls[0].input.startImage as Blob).text()).toBe("img1");
    // Each extension uploads the ending of the film joined so far
    expect(job.calls[1].input).toMatchObject({ sourceVideo: btoa("tail(all)"), extensionDuration: 10, referenceImages: ["cropped:img3"] });
    expect(job.calls[2].input).toMatchObject({ sourceVideo: btoa("tail(all+from5)"), extensionDuration: 8, referenceImages: ["cropped:img5"] });
    expect(job.calls[1].input.sourceVideoUri).toBeUndefined();
    expect(h.film()).toMatchObject({ status: "completed", done: 3, total: 3, duration: 28, sourceVideoUri: "job-3" });
    expect(h.film().prompts).toHaveLength(3);
    // The first output is kept whole; later ones drop the uploaded clip at their start
    expect(await Promise.all(h.film().segments!.map((b) => b.text()))).toEqual(["all", "from5", "from5"]);
    expect(await h.film().blob!.text()).toBe("all+from5+from5");
  });

  it("keeps the finished part when a later segment fails", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext(new Error("RESOURCE_EXHAUSTED"));
    await running;
    expect(h.film()).toMatchObject({ status: "failed", done: 1, duration: 10, sourceVideoUri: "job-1" });
    expect(h.film().error).toBe("RESOURCE_EXHAUSTED");
  });

  it("stops without starting the next segment and cancels the running one", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await tick();
    stopFilm(h.ctx);
    expect(svc.cancelled).toEqual(["job-2"]);
    expect(h.film().status).toBe("stopped");
    job.settle.shift()!("ok");
    await running;
    expect(job.calls).toHaveLength(2);
    expect(h.film()).toMatchObject({ status: "stopped", done: 1 });
  });

  it("can start again right after a stop", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const first = generateFilm(h.ctx, p, options);
    await tick();
    stopFilm(h.ctx);
    const second = generateFilm(h.ctx, p, options);
    await tick();
    expect(h.film().status).toBe("generating");
    job.settle.forEach((settle) => settle("ok"));
    job.settle = [];
    await first;
    await finishNext();
    await second;
    expect(h.film().status).toBe("completed");
  });

  it("resumes a failed film at the failed segment, keeping the finished part", async () => {
    const p = project([10, 10, 10]);
    const h = harness(p);
    const first = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await finishNext(new Error("400 There was a problem processing your request"));
    await first;
    expect(h.film()).toMatchObject({ status: "failed", done: 2, duration: 20 });
    expect(canResumeFilm(h.get())).toBe(true);

    job.calls = [];
    const again = resumeFilm(h.ctx, h.get());
    await finishNext();
    await again;
    expect(job.calls).toHaveLength(1);
    expect(job.calls[0]).toMatchObject({ kind: "extend", input: { sourceVideo: btoa("tail(all+from5)"), extensionDuration: 10 } });
    expect(h.film()).toMatchObject({ status: "completed", done: 3, duration: 30, error: undefined });
    expect(await h.film().blob!.text()).toBe("all+from5+from5");
  });

  it("cannot resume once the storyboard splits differently", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const first = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext(new Error("boom"));
    await first;
    const changed = { ...h.get(), shots: h.get().shots.slice(0, 1) };
    expect(canResumeFilm(changed)).toBe(false);
  });
});
