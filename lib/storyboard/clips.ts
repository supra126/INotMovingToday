import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
} from "mediabunny";

/** Which part of a clip to keep: from a time to the end, or the last few seconds */
export type ClipRange = { from: number; to?: number } | { last: number };

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
    trim: { start, ...(range && "to" in range && range.to !== undefined ? { end: range.to } : {}) },
    video: { forceTranscode: true, codec: "avc", quality },
    audio: { forceTranscode: true, codec: "aac", bitrate: QUALITY_HIGH },
  });
  if (!conversion.isValid) throw new Error("errors.mergeMismatch");
  await conversion.execute();
  return new Blob([target.buffer!], { type: "video/mp4" });
}

/** Length of a clip in seconds */
export async function clipLength(blob: Blob): Promise<number> {
  return new Input({ source: new BlobSource(blob), formats: ALL_FORMATS }).computeDuration();
}

// Short side of clips sent to Omni as input. Omni only reads them; the output resolution is set separately.
// A detailed 10 s clip at 1080p came to 21 MB as base64, over the 20 MB request limit (2026-10-20).
const UPLOAD_SHORT_SIDE = 720;

/** Encode part of a clip small enough to upload: at most 720p, medium quality */
async function encodeForUpload(blob: Blob, range?: ClipRange): Promise<Blob> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("errors.unsupportedVideo");
  const short = Math.min(track.displayWidth, track.displayHeight);
  const scale = Math.min(1, UPLOAD_SHORT_SIDE / short);
  // H.264 needs even sizes
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  const start = !range ? 0 : "from" in range ? range.from : Math.max(0, (await input.computeDuration()) - range.last);
  const target = new BufferTarget();
  const conversion = await Conversion.init({
    input,
    output: new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target }),
    trim: { start, ...(range && "to" in range && range.to !== undefined ? { end: range.to } : {}) },
    video: {
      forceTranscode: true,
      codec: "avc",
      quality: QUALITY_MEDIUM,
      width: even(track.displayWidth),
      height: even(track.displayHeight),
      fit: "fill",
    },
    audio: { forceTranscode: true, codec: "aac", bitrate: QUALITY_MEDIUM },
  });
  if (!conversion.isValid) throw new Error("errors.mergeMismatch");
  await conversion.execute();
  return new Blob([target.buffer!], { type: "video/mp4" });
}

/** A clip re-encoded small enough to upload (Omni edits clips of 10 s or less) */
export async function uploadableClip(blob: Blob): Promise<Blob> {
  return encodeForUpload(blob);
}

/** The last `seconds` of a clip, small enough to upload, and how long it really is */
export async function tailClip(blob: Blob, seconds: number): Promise<{ blob: Blob; seconds: number }> {
  const tail = await encodeForUpload(blob, { last: seconds });
  return { blob: tail, seconds: await new Input({ source: new BlobSource(tail), formats: ALL_FORMATS }).computeDuration() };
}
