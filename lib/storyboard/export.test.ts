import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { ALL_FORMATS, BlobSource, EncodedPacketSink, Input } from "mediabunny";
import { describe, expect, it } from "vitest";
import { concatVideos, zipVideos } from "./export";

const clip = (name: string) =>
  new Blob([readFileSync(join(__dirname, "__fixtures__", `${name}.mp4`))], { type: "video/mp4" });

describe("concatVideos", () => {
  it("joins clips end to end without re-encoding, keeping the sound", async () => {
    const merged = await concatVideos([clip("clip-red"), clip("clip-blue")]);
    const input = new Input({ source: new BlobSource(merged), formats: ALL_FORMATS });
    expect(await input.computeDuration()).toBeCloseTo(2, 1);
    expect(await input.getPrimaryAudioTrack()).not.toBeNull();
    expect((await input.getPrimaryVideoTrack())?.codedWidth).toBe(90);
  });

  it("keeps every real audio packet and drops only the priming before 0", async () => {
    const audioPackets = async (blob: Blob, keep: (t: number) => boolean) => {
      const track = await new Input({ source: new BlobSource(blob), formats: ALL_FORMATS }).getPrimaryAudioTrack();
      let n = 0;
      for await (const packet of new EncodedPacketSink(track!).packets()) if (keep(packet.timestamp)) n++;
      return n;
    };
    const one = await audioPackets(clip("clip-red"), (t) => t >= 0 && t < 1);
    const merged = await concatVideos([clip("clip-red"), clip("clip-blue")]);
    expect(await audioPackets(merged, () => true)).toBe(one * 2);
    // The merged file opens with the clip's first real packet, not its priming
    const firstReal = async (blob: Blob) => {
      const track = await new Input({ source: new BlobSource(blob), formats: ALL_FORMATS }).getPrimaryAudioTrack();
      for await (const packet of new EncodedPacketSink(track!).packets()) if (packet.timestamp >= 0) return packet.data;
    };
    expect(await firstReal(merged)).toEqual(await firstReal(clip("clip-red")));
  });

  it("refuses clips whose size or tracks differ", async () => {
    await expect(concatVideos([clip("clip-red"), clip("clip-wide-silent")])).rejects.toThrow("errors.mergeMismatch");
  });
});

describe("zipVideos", () => {
  it("stores the files in shot order", async () => {
    const zip = await zipVideos([
      { name: "01_s02.mp4", blob: new Blob(["a"]) },
      { name: "02_s01.mp4", blob: new Blob(["b"]) },
    ]);
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files)).toEqual(["01_s02.mp4", "02_s01.mp4"]);
    expect(new TextDecoder().decode(files["02_s01.mp4"])).toBe("b");
  });
});
