/** Seconds this close to an end count as the end, so no sliver of a frame is kept */
const EDGE = 0.05;

/**
 * Put an edited part back into the whole video: the untouched parts before and after it are kept.
 * Everything is decoded and encoded once, in one pass, at the source's size: joining separately encoded
 * parts failed because Omni's output differs in size and in small encoder settings (2026-10-20).
 */
export async function spliceEdit(whole: Blob, from: number, to: number, total: number, edited: Blob): Promise<Blob> {
  const mb = await import("mediabunny");
  const open = (blob: Blob) => new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
  const wholeIn = open(whole);
  const editedIn = open(edited);
  const wholeVideo = await wholeIn.getPrimaryVideoTrack();
  const editedVideo = await editedIn.getPrimaryVideoTrack();
  if (!wholeVideo || !editedVideo) throw new Error("errors.unsupportedVideo");
  const wholeAudio = await wholeIn.getPrimaryAudioTrack();
  const editedAudio = await editedIn.getPrimaryAudioTrack();
  const editedSeconds = await editedIn.computeDuration();
  const width = wholeVideo.displayWidth;
  const height = wholeVideo.displayHeight;
  const frameRate = Math.round((await wholeVideo.computePacketStats(120)).averagePacketRate) || 30;

  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const videoOut = new mb.VideoSampleSource({ codec: "avc", bitrate: mb.QUALITY_VERY_HIGH });
  output.addVideoTrack(videoOut, { frameRate });
  // A silent source stays silent; Omni's added sound would have nothing to join to
  const audioOut = wholeAudio ? new mb.AudioSampleSource({ codec: "aac", bitrate: mb.QUALITY_HIGH }) : null;
  if (audioOut) output.addAudioTrack(audioOut);
  await output.start();

  // Before the edit, the edit, after the edit: where each is read from and where it lands
  const parts = [
    { video: wholeVideo, audio: wholeAudio, start: 0, end: from, at: 0 },
    { video: editedVideo, audio: editedAudio, start: 0, end: editedSeconds, at: from },
    { video: wholeVideo, audio: wholeAudio, start: to, end: total, at: from + editedSeconds },
  ].filter((p) => p.end - p.start > EDGE);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  for (const part of parts) {
    for await (const sample of new mb.VideoSampleSink(part.video).samples(part.start, part.end)) {
      // Cover-fit the frame to the source size (Omni may return another resolution)
      const scale = Math.max(width / sample.displayWidth, height / sample.displayHeight);
      const w = sample.displayWidth * scale;
      const h = sample.displayHeight * scale;
      sample.draw(ctx, (width - w) / 2, (height - h) / 2, w, h);
      const frame = new mb.VideoSample(canvas, {
        timestamp: part.at + Math.max(0, sample.timestamp - part.start),
        duration: sample.duration,
      });
      await videoOut.add(frame);
      frame.close();
      sample.close();
    }
  }
  if (audioOut) {
    for (const part of parts) {
      if (!part.audio) continue;
      for await (const sample of new mb.AudioSampleSink(part.audio).samples(part.start, part.end)) {
        sample.setTimestamp(part.at + Math.max(0, sample.timestamp - part.start));
        await audioOut.add(sample);
        sample.close();
      }
    }
  }
  await output.finalize();
  return new Blob([target.buffer!], { type: "video/mp4" });
}

/** Keep a picked range inside the video and no longer than the edit limit, moving the other end if needed */
export function clampRange(
  range: { from: number; to: number },
  moved: "from" | "to",
  total: number,
  max: number,
  min = 1
): { from: number; to: number } {
  let { from, to } = range;
  from = Math.min(Math.max(0, from), Math.max(0, total - min));
  to = Math.max(Math.min(total, to), Math.min(total, min));
  if (moved === "from") {
    if (to - from > max) to = from + max;
    if (to - from < min) to = Math.min(total, from + min);
  } else {
    if (to - from > max) from = to - max;
    if (to - from < min) from = Math.max(0, to - min);
  }
  return { from: +from.toFixed(2), to: +to.toFixed(2) };
}
