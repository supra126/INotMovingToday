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

/**
 * Cut a clip from `start` to its end and encode it once at high quality, in the browser.
 * Every clip goes through the same encoder settings, so clips can then be joined without re-encoding.
 */
export async function trimClip(blob: Blob, start: number): Promise<Blob> {
  const target = new BufferTarget();
  const conversion = await Conversion.init({
    input: new Input({ source: new BlobSource(blob), formats: ALL_FORMATS }),
    output: new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target }),
    trim: { start },
    video: { forceTranscode: true, codec: "avc", quality: QUALITY_VERY_HIGH },
    audio: { forceTranscode: true, codec: "aac", bitrate: QUALITY_HIGH },
  });
  if (!conversion.isValid) throw new Error("errors.mergeMismatch");
  await conversion.execute();
  return new Blob([target.buffer!], { type: "video/mp4" });
}
