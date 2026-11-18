import { beforeEach, describe, expect, it, vi } from "vitest";

const stripAudioUrl = vi.fn();
vi.mock("./strip", () => ({ stripAudioUrl: (url: string) => stripAudioUrl(url) }));
vi.mock("@/services/videoService", () => ({}));

import { silenced } from "./job";

describe("silenced", () => {
  beforeEach(() => {
    stripAudioUrl.mockReset();
    vi.stubGlobal("URL", Object.assign(URL, { revokeObjectURL: vi.fn() }));
  });

  it("leaves the video alone unless the audio mode is none", async () => {
    const result = { videoUrl: "blob:a" };
    expect(await silenced(result, "sfx")).toBe(result);
    expect(stripAudioUrl).not.toHaveBeenCalled();
  });

  it("swaps in the silent video and frees the original", async () => {
    stripAudioUrl.mockResolvedValue("blob:silent");
    expect(await silenced({ videoUrl: "blob:a", sourceVideoUri: "x" }, "none")).toEqual({ videoUrl: "blob:silent", sourceVideoUri: "x" });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:a");
  });

  it("keeps the paid video when the audio cannot be removed", async () => {
    stripAudioUrl.mockRejectedValue(new Error("unsupported codec"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = { videoUrl: "blob:a" };
    expect(await silenced(result, "none")).toBe(result);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
