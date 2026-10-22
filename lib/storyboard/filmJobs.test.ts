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
  uploadableClip: async (blob: Blob) => new Blob([`up(${await blob.text()})`]),
  clipLength: async () => 10,
}));
vi.mock("./export", () => ({
  concatVideos: async (blobs: Blob[]) => new Blob([(await Promise.all(blobs.map((b) => b.text()))).join("+")]),
}));
vi.mock("@/lib/video/crop", () => ({ referenceImageForRatio: async (blob: Blob) => `cropped:${await blob.text()}` }));
// Each started job records its input and waits until the test settles it
const job = vi.hoisted(() => ({
  calls: [] as { kind: "generate" | "extend" | "edit"; input: Record<string, unknown> }[],
  settle: [] as ((outcome: "ok" | "unfetchable" | Error) => void)[],
}));
vi.mock("@/lib/video/job", () => {
  const start = (kind: "generate" | "extend" | "edit") =>
    async (input: Record<string, unknown>, hooks: { isCancelled: () => boolean; onJobId?: (id: string) => void }) => {
      if (hooks.isCancelled()) return null;
      job.calls.push({ kind, input });
      const id = `job-${job.calls.length}`;
      hooks.onJobId?.(id);
      const outcome = await new Promise<"ok" | "unfetchable" | Error>((resolve) => job.settle.push(resolve));
      if (outcome instanceof Error) throw outcome;
      // An URL that cannot be fetched, like an expired Files API link
      const videoUrl = outcome === "unfetchable" ? "blob:expired" : `data:video/mp4;base64,${btoa(id)}`;
      return hooks.isCancelled() ? null : { videoUrl, sourceVideoUri: id };
    };
  return { runVideoJob: start("generate"), runExtendJob: start("extend"), runEditJob: start("edit") };
});
import { canResumeFilm, editFilmSegment, generateFilm, redoFilmFrom, redoableFrom, resumeFilm, stopFilm, undoFilmSegmentEdit } from "./filmJobs";
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
async function finishNext(outcome: "ok" | "unfetchable" | Error = "ok") {
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
    const p = project([10, 10, 8]);
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
    expect(job.calls[1].input).toMatchObject({ sourceVideo: btoa("tail(all)"), extensionDuration: 10, referenceImages: ["cropped:img2"] });
    expect(job.calls[2].input).toMatchObject({ sourceVideo: btoa("tail(all+from5)"), extensionDuration: 8, referenceImages: ["cropped:img3"] });
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
    // The chain retry fails as well
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
    // The chain retry fails as well
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
    // The chain retry fails as well
    await finishNext(new Error("boom"));
    await first;
    const changed = { ...h.get(), shots: h.get().shots.slice(0, 1) };
    expect(canResumeFilm(changed)).toBe(false);
  });

  it("redoes a finished film from a later segment, keeping the parts before it", async () => {
    const p = project([10, 10, 10]);
    const h = harness(p);
    const first = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await finishNext();
    await first;
    expect(redoableFrom(h.get())).toEqual([1, 2]);

    job.calls = [];
    const again = redoFilmFrom(h.ctx, h.get(), 1);
    expect(h.film()).toMatchObject({ status: "generating", done: 1 });
    await finishNext();
    await finishNext();
    await again;
    expect(job.calls.map((c) => c.kind)).toEqual(["extend", "extend"]);
    // The first redone segment continues from the ending of the kept part
    expect(job.calls[0].input).toMatchObject({ sourceVideo: btoa("tail(all)") });
    expect(h.film()).toMatchObject({ status: "completed", done: 3, duration: 30 });
  });

  it("leaves skipped shots out of the film", async () => {
    const p = project([10, 10, 10]);
    p.shots[1] = { ...p.shots[1], skipped: true };
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await running;
    expect(h.film()).toMatchObject({ total: 2, duration: 20 });
    expect(job.calls[1].input).toMatchObject({ referenceImages: ["cropped:img3"] });
  });

  it("retries a failed upload extension through Google's own chain", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext(new Error("500 There was a problem processing your request"));
    await finishNext();
    await running;
    expect(job.calls.map((c) => c.input.sourceVideo ? "upload" : c.input.sourceVideoUri)).toEqual([undefined, "upload", "job-1"]);
    expect(h.film()).toMatchObject({ status: "completed", done: 2 });
    // The chain's output has the new part last
    expect(await h.film().blob!.text()).toBe("all+last10");
  });

  it("sends only the frame for a packaging shot, not the product photo", async () => {
    const p = project([10, 10]);
    p.productImages = [{ blob: new Blob(["product"]), mimeType: "image/png" }];
    p.shots[1] = { ...p.shots[1], hasPackaging: true };
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await running;
    expect(job.calls[1].input.referenceImages).toEqual(["cropped:img2"]);
  });

  it("edits one segment, rejoins the film, and can undo it", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await running;
    expect(await h.film().blob!.text()).toBe("all+from5");

    job.calls = [];
    const editing = editFilmSegment(h.ctx, h.get(), 1, "把包裝換成參考圖的產品", [new Blob(["product"])]);
    await tick();
    expect(h.film().segmentEdit).toMatchObject({ index: 1, status: "editing" });
    await finishNext();
    await editing;
    expect(job.calls[0]).toMatchObject({
      kind: "edit",
      input: { prompt: "把包裝換成參考圖的產品", sourceVideo: btoa("up(from5)"), referenceImages: ["cropped:product"], duration: 10 },
    });
    // The edited part replaces only segment 2
    expect(await Promise.all(h.film().segments!.map((b) => b.text()))).toEqual(["all", "all"]);
    expect(await h.film().blob!.text()).toBe("all+all");
    expect(await h.film().segmentsBeforeEdit![1].text()).toBe("from5");
    expect(h.film().segmentEdit).toBeUndefined();

    await undoFilmSegmentEdit(h.ctx, h.get(), 1);
    expect(await h.film().blob!.text()).toBe("all+from5");
    expect(h.film().segmentsBeforeEdit).toEqual({});
  });

  it("keeps the film when an edit fails", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await running;
    const editing = editFilmSegment(h.ctx, h.get(), 0, "改成綠燈", []);
    await finishNext(new Error("500 There was a problem processing your request"));
    await editing;
    expect(h.film()).toMatchObject({ status: "completed", segmentEdit: { index: 0, status: "failed" } });
    expect(await h.film().blob!.text()).toBe("all+from5");
  });

  it("does not call a film finished when its last segment could not be downloaded", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const running = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext("unfetchable");
    await running;
    // The first segment stays as the film so far; the second is reported failed, not done
    expect(h.film()).toMatchObject({ status: "failed", done: 1 });
    expect(await h.film().blob!.text()).toBe("all");
  });

  it("will not regenerate while a segment edit runs, and drops an edit whose film was replaced", async () => {
    const p = project([10, 10]);
    const h = harness(p);
    const first = generateFilm(h.ctx, p, options);
    await finishNext();
    await finishNext();
    await first;

    job.calls = [];
    const editing = editFilmSegment(h.ctx, h.get(), 1, "改成綠燈", []);
    await tick();
    await generateFilm(h.ctx, h.get(), options);
    expect(job.calls.map((c) => c.kind)).toEqual(["edit"]);

    // The film is replaced behind the edit's back (e.g. another tab)
    h.ctx.update((q) => ({ ...q, film: { ...q.film!, segments: [new Blob(["other"]), new Blob(["other"])] } }));
    await finishNext();
    await editing;
    expect(h.film().segmentEdit).toMatchObject({ status: "failed", error: "errors.filmChanged" });
    expect(await Promise.all(h.film().segments!.map((b) => b.text()))).toEqual(["other", "other"]);
  });
});
