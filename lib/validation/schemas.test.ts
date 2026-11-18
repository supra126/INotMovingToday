import { describe, expect, it } from "vitest";
import { GenerateVideoParamsSchema } from "./schemas";

const base = { prompt: "a product on a table", ratio: "9:16" as const, duration: 8 };

describe("GenerateVideoParamsSchema (Omni 1.2)", () => {
  it("accepts 360p and clips up to 15 s", () => {
    expect(GenerateVideoParamsSchema.safeParse({ ...base, resolution: "360p", duration: 15 }).success).toBe(true);
    expect(GenerateVideoParamsSchema.safeParse({ ...base, duration: 16 }).success).toBe(false);
  });

  it("keeps first + last frame clips at 10 s or less", () => {
    const frames = { ...base, firstFrameImage: "a", lastFrameImage: "b" };
    expect(GenerateVideoParamsSchema.safeParse({ ...frames, duration: 10 }).success).toBe(true);
    expect(GenerateVideoParamsSchema.safeParse({ ...frames, duration: 12 }).success).toBe(false);
  });

  it("allows 3 reference videos up to 10 s and only 1 beyond", () => {
    const three = ["v1", "v2", "v3"];
    expect(GenerateVideoParamsSchema.safeParse({ ...base, duration: 10, referenceVideos: three }).success).toBe(true);
    expect(GenerateVideoParamsSchema.safeParse({ ...base, duration: 12, referenceVideos: three }).success).toBe(false);
    expect(GenerateVideoParamsSchema.safeParse({ ...base, duration: 15, referenceVideos: ["v1"] }).success).toBe(true);
    expect(GenerateVideoParamsSchema.safeParse({ ...base, referenceVideos: [...three, "v4"] }).success).toBe(false);
  });
});
