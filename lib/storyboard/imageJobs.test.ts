import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/services/imageService", () => ({
  generateImage: async () => {
    calls.count++;
    return { blob: new Blob(["img"]), mimeType: "image/png" };
  },
}));

import { generateCandidates } from "./imageJobs";
import { newProject, toShot } from "./shots";
import type { StoryboardProject } from "./types";

describe("generateCandidates", () => {
  it("skips shots whose candidates are already being generated", async () => {
    let state: StoryboardProject = newProject("p", 0);
    state.productImages = [{ blob: new Blob(["product"]), mimeType: "image/png" }];
    state.shots = [
      {
        ...toShot({ id: "s01", seconds: 4, visual: "v", camera: "", sound: "", music: "無", onScreenText: "", transition: "", hasPackaging: false }, true),
        imagePrompt: "prompt",
        imageStatus: "generating",
      },
    ];
    const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => (state = fn(state)) };
    await generateCandidates(ctx, state, ["s01"]);
    expect(calls.count).toBe(0);
  });
});
