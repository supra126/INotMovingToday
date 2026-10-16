import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
} from "mediabunny";

/** Which part of a clip to keep: from a time to the end, or the last few seconds */
export type ClipRange = { from: number } | { last: number };

/**
 * Keep part of a clip (all of it when no range) and encode it once in the browser.
 * Every clip goes through the same encoder settings, so clips can then be joined without re-encoding.
 */
export async function trimClip(blob: Blob, range?: ClipRange, quality = QUALITY_VERY_HIGH): Promise<Blob> {
  const target = new BufferTarget();
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const start = !range ? 0 : "from" in range ? range.from : Math.max(0, (await input.computeDuration()) - range.last);
  const conversion = await Conversion.init({
    input,
    output: new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target }),
    trim: { start },
    video: { forceTranscode: true, codec: "avc", quality },
    audio: { forceTranscode: true, codec: "aac", bitrate: QUALITY_HIGH },
  });
  if (!conversion.isValid) throw new Error("errors.mergeMismatch");
  await conversion.execute();
  return new Blob([target.buffer!], { type: "video/mp4" });
}

/** The last `seconds` of a clip, at a quality fine for context, and how long it really is */
export async function tailClip(blob: Blob, seconds: number): Promise<{ blob: Blob; seconds: number }> {
  const tail = await trimClip(blob, { last: seconds }, QUALITY_HIGH);
  return { blob: tail, seconds: await new Input({ source: new BlobSource(tail), formats: ALL_FORMATS }).computeDuration() };
}
