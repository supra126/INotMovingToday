import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } from "mediabunny";

/**
 * Remove the sound track, copying the video as it is (no re-encode).
 * Omni has no audio switch, so "silent" videos are made silent here.
 */
export async function stripAudio(blob: Blob): Promise<Blob> {
  const target = new BufferTarget();
  const conversion = await Conversion.init({
    input: new Input({ source: new BlobSource(blob), formats: ALL_FORMATS }),
    output: new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target }),
    audio: { discard: true },
  });
  if (!conversion.isValid) throw new Error("errors.videoGenerationFailed");
  await conversion.execute();
  return new Blob([target.buffer!], { type: "video/mp4" });
}

/** The same for a playable URL (blob: or data:); hands back a blob: URL */
export async function stripAudioUrl(url: string): Promise<string> {
  const silent = await stripAudio(await (await fetch(url)).blob());
  return URL.createObjectURL(silent);
}
