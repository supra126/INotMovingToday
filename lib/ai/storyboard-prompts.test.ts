import { describe, expect, it } from "vitest";
import {
  buildImagePromptsPrompt,
  buildScriptParsePrompt,
  buildScriptRevisePrompt,
  parseImagePrompts,
  parseRewrittenPrompt,
  parseScriptResult,
} from "./storyboard-prompts";

const ctx = { ratio: "9:16" as const, tone: "高級、乾淨", packagingText: "PDRN 極潤修護黑面膜", locale: "zh" as const };

describe("parseScriptResult", () => {
  it("normalizes ids, seconds and missing fields", () => {
    const result = parseScriptResult({
      reply: "好的",
      suggestions: ["前 2 秒加快", 3],
      shots: [
        { id: "1", seconds: "4秒", visual: "黑色布膜展開", music: "" },
        { seconds: 15, visual: "產品與 Logo", hasPackaging: true },
        { seconds: 0, visual: "  " },
      ],
    });
    expect(result.shots.map((s) => s.id)).toEqual(["s01", "s02"]);
    expect(result.shots[0].seconds).toBe(4);
    expect(result.shots[0].music).toBe("無");
    expect(result.shots[0].camera).toBe("");
    expect(result.shots[1].seconds).toBe(10);
    expect(result.shots[1].hasPackaging).toBe(true);
    expect(result.suggestions).toEqual(["前 2 秒加快"]);
    expect(result.reply).toBe("好的");
  });
  it("defaults unreadable seconds to 4", () => {
    expect(parseScriptResult({ shots: [{ visual: "a", seconds: "幾秒" }] }).shots[0].seconds).toBe(4);
  });
  it("throws when there are no shots", () => {
    expect(() => parseScriptResult({ shots: [] })).toThrow();
    expect(() => parseScriptResult(null)).toThrow();
  });
});

describe("parseImagePrompts", () => {
  it("returns a prompt per id", () => {
    expect(parseImagePrompts({ prompts: { s01: " a ", s02: "b" } }, ["s01", "s02"])).toEqual({ s01: "a", s02: "b" });
  });
  it("throws when a shot is missing", () => {
    expect(() => parseImagePrompts({ prompts: { s01: "a" } }, ["s01", "s02"])).toThrow("s02");
  });
});

describe("parseRewrittenPrompt", () => {
  it("reads the prompt", () => {
    expect(parseRewrittenPrompt({ prompt: " new " })).toBe("new");
    expect(() => parseRewrittenPrompt({})).toThrow();
  });
});

describe("prompt builders", () => {
  it("include the storyboard rules and context", () => {
    const text = buildScriptParsePrompt({ ...ctx, sourceText: "布膜材質動畫", hasSourceImage: true, productCount: 1 });
    expect(text).toContain("布膜材質動畫");
    expect(text).toContain("first image");
    expect(text).toContain("3 to 10 seconds");
    expect(text).toContain("Traditional Chinese");
    expect(text).toContain("PDRN 極潤修護黑面膜");
  });
  it("send the current table and the request when revising", () => {
    const shots = parseScriptResult({ shots: [{ visual: "布膜展開" }] }).shots;
    const text = buildScriptRevisePrompt({ ...ctx, shots, chat: [], message: "s01 改成手拿面膜" });
    expect(text).toContain("布膜展開");
    expect(text).toContain("s01 改成手拿面膜");
  });
  it("asks for English image prompts keyed by shot id", () => {
    const shots = parseScriptResult({ shots: [{ visual: "布膜展開" }] }).shots;
    expect(buildImagePromptsPrompt({ ...ctx, shots })).toContain('"s01"');
  });
});

describe("shot ids", () => {
  it("keeps valid AI ids so revised tables match the right shots", () => {
    const result = parseScriptResult({
      shots: [
        { id: "s01", visual: "a" },
        { id: "s06", visual: "inserted" },
        { id: "s02", visual: "b" },
        { id: "s01", visual: "duplicate" },
      ],
    });
    expect(result.shots.map((s) => s.id)).toEqual(["s01", "s06", "s02", "s07"]);
  });
});
