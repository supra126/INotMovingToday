import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ descriptions: [] as string[] }));
vi.mock("@/services/videoService", () => ({
  composePrompt: async () => "prompt",
  draftPrompt: async (_images: File[], input: { description: string }) => {
    calls.descriptions.push(input.description);
    const field = (value: string) => ({ value, options: [] });
    return {
      summary: "",
      fields: {
        subject: field("新主體"), setting: field("新場景"), camera: field("新運鏡"), lighting: field("新光線"), sound: field("新音效"),
      },
    };
  },
}));
import { newProject, toShot } from "./shots";
import type { StoryboardProject } from "./types";
import { draftShotFields, redraftShotFields } from "./videoJobs";

function project(): StoryboardProject {
  const p = newProject("p", 0);
  p.shots = [
    {
      ...toShot({ id: "s01", seconds: 4, visual: "瓶子在桌上", camera: "", sound: "", music: "無", onScreenText: "", transition: "", hasPackaging: false }, true),
      finalImage: { blob: new Blob(["img"]), mimeType: "image/png" },
      fields: { subject: "舊主體", setting: "舊場景", camera: "舊運鏡", lighting: "舊光線", sound: "舊音效" },
    },
  ];
  return p;
}

describe("redraftShotFields", () => {
  it("rewrites the fields from the user's own description and keeps it", async () => {
    let state = project();
    const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => { state = fn(state); } };
    await redraftShotFields(ctx, state, "s01", "鏡頭慢慢推近，手把瓶子轉過來", "zh");
    const shot = state.shots[0];
    expect(calls.descriptions[0]).toContain("鏡頭慢慢推近，手把瓶子轉過來");
    expect(calls.descriptions[0]).toContain("瓶子在桌上");
    expect(shot.brief).toBe("鏡頭慢慢推近，手把瓶子轉過來");
    expect(shot.fields).toEqual({ subject: "新主體", setting: "新場景", camera: "新運鏡", lighting: "新光線", sound: "新音效" });
    expect(shot.draftStatus).toBeUndefined();
  });

  it("keeps using the description when a new frame needs fields again", async () => {
    let state = project();
    state.shots[0] = { ...state.shots[0], fields: undefined, brief: "手把瓶子轉過來" };
    const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => { state = fn(state); } };
    await draftShotFields(ctx, state, "zh");
    expect(calls.descriptions.at(-1)).toContain("手把瓶子轉過來");
  });

  it("writes the storyboard note in English for English users", async () => {
    let state = project();
    state.shots[0] = { ...state.shots[0], fields: undefined, brief: "turn the bottle" };
    const ctx = { projectId: "p", apiKey: "k", update: (fn: (p: StoryboardProject) => StoryboardProject) => { state = fn(state); } };
    await draftShotFields(ctx, state, "en");
    expect(calls.descriptions.at(-1)).not.toContain("分鏡原本的設定");
  });
});
