import { describe, expect, it, vi } from "vitest";

const job = vi.hoisted(() => ({ input: null as Record<string, unknown> | null, fail: false }));
vi.mock("@/services/videoService", () => ({
  composePrompt: async () => "prompt",
  draftPrompt: async () => { throw new Error("unused"); },
  cancelVideoGeneration: async () => {},
}));
vi.mock("@/lib/video/crop", () => ({ cropImageToRatio: async (blob: Blob) => `cropped:${await blob.text()}` }));
vi.mock("@/lib/video/job", () => ({
  runVideoJob: async () => null,
  runExtendJob: async () => null,
  runEditJob: async (input: Record<string, unknown>) => {
    job.input = input;
    if (job.fail) throw new Error("500 There was a problem processing your request");
    return { videoUrl: `data:video/mp4;base64,${btoa("edited")}`, sourceVideoUri: "edit-1" };
  },
}));
import { newProject, toShot } from "./shots";
import type { ShotVideo, StoryboardProject } from "./types";
import { editShotVideo, undoShotVideoEdit } from "./videoJobs";

const generated: ShotVideo = { status: "completed", progress: 100, prompt: "p", duration: 6, blob: new Blob(["original"]), sourceVideoUri: "gen-1" };

function harness() {
  const p = newProject("p", 0);
  p.shots = [{ ...toShot({ id: "s01", seconds: 6, visual: "v", camera: "", sound: "", music: "無", onScreenText: "", transition: "", hasPackaging: true }, true), video: generated }];
  let state: StoryboardProject = p;
  const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => { state = fn(state); } };
  return { ctx, get: () => state, video: () => state.shots[0].video! };
}

describe("editShotVideo", () => {
  it("edits through the generated video's interaction, and undo brings the original back", async () => {
    job.fail = false;
    const h = harness();
    await editShotVideo(h.ctx, h.get(), "s01", "把包裝換成參考圖的產品", [new Blob(["product"])]);
    expect(job.input).toMatchObject({ sourceVideoUri: "gen-1", referenceImages: ["cropped:product"], duration: 6 });
    expect(job.input!.sourceVideo).toBeUndefined();
    expect(await h.video().blob!.text()).toBe("edited");
    expect(h.video()).toMatchObject({ status: "completed", sourceVideoUri: "edit-1" });

    undoShotVideoEdit(h.ctx, "s01");
    expect(await h.video().blob!.text()).toBe("original");
    expect(h.video()).toMatchObject({ sourceVideoUri: "gen-1", beforeEdit: undefined });
  });

  it("keeps the video when the edit fails", async () => {
    job.fail = true;
    const h = harness();
    await editShotVideo(h.ctx, h.get(), "s01", "改成綠燈", []);
    expect(await h.video().blob!.text()).toBe("original");
    expect(h.video().error).toBeTruthy();
  });
});
