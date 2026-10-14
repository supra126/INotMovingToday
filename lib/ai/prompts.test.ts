import { describe, expect, it } from "vitest";
import { buildPromptComposePrompt, buildPromptDraftPrompt, type PromptContext } from "./prompts";

const ctx: PromptContext = { imageCount: 1, mode: "single_image", ratio: "9:16", duration: 4, audioMode: "sfx", locale: "zh" };
const fields = { subject: "灰狼大喊「我要吹倒你的房子！」", setting: "", camera: "", lighting: "", sound: "" };

describe("spoken lines", () => {
  it("keep dialogue in its own language instead of translating it", () => {
    const text = buildPromptComposePrompt(fields, ctx);
    expect(text).toContain("Never translate spoken lines");
    expect(text).toContain("Mandarin Chinese");
  });
  it("default to English speech for English users", () => {
    expect(buildPromptComposePrompt(fields, { ...ctx, locale: "en" })).not.toContain("Mandarin");
  });
  it("ask the draft to write spoken lines word for word", () => {
    expect(buildPromptDraftPrompt({ ...ctx, description: "" })).toContain("spoken lines");
  });
});
