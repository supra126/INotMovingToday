export interface EditedPart {
  /** Where the edited part was cut from in the whole video */
  from: number;
  to: number;
  blob: Blob;
}

/** Seconds this close to an end count as the end, so no sliver of a frame is kept */
const EDGE = 0.05;

/**
 * Put an edited part back into the whole video: the untouched parts before and after it are kept.
 * Everything is decoded and encoded once, in one pass, at the source's size: joining separately encoded
 * parts failed because Omni's output differs in size and in small encoder settings (2026-10-20).
 */
export async function spliceEdit(whole: Blob, from: number, to: number, total: number, edited: Blob): Promise<Blob> {
  return spliceEdits(whole, total, [{ from, to, blob: edited }]);
}

/** Put several edited parts back in one pass; parts are back to back or apart, in time order */
export async function spliceEdits(whole: Blob, total: number, edits: EditedPart[]): Promise<Blob> {
  const mb = await import("mediabunny");
  const open = (blob: Blob) => new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
  const wholeIn = open(whole);
  const wholeVideo = await wholeIn.getPrimaryVideoTrack();
  if (!wholeVideo) throw new Error("errors.unsupportedVideo");
  const wholeAudio = await wholeIn.getPrimaryAudioTrack();
  const edited = await Promise.all(
    [...edits]
      .sort((a, b) => a.from - b.from)
      .map(async (edit) => {
        const input = open(edit.blob);
        const video = await input.getPrimaryVideoTrack();
        if (!video) throw new Error("errors.unsupportedVideo");
        return { ...edit, video, audio: await input.getPrimaryAudioTrack(), seconds: await input.computeDuration() };
      })
  );
  const width = wholeVideo.displayWidth;
  const height = wholeVideo.displayHeight;
  const frameRate = Math.round((await wholeVideo.computePacketStats(120)).averagePacketRate) || 30;

  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const videoOut = new mb.VideoSampleSource({ codec: "avc", bitrate: mb.QUALITY_VERY_HIGH });
  output.addVideoTrack(videoOut, { frameRate });
  // Sound if the source or any edit has it (new music on a silent source); parts without sound get silence
  const firstAudio = wholeAudio ?? edited.find((e) => e.audio)?.audio ?? null;
  const audioOut = firstAudio ? new mb.AudioSampleSource({ codec: "aac", bitrate: mb.QUALITY_HIGH }) : null;
  if (audioOut) output.addAudioTrack(audioOut);
  await output.start();

  // Untouched source and edits in turn: where each is read from and where it lands
  // (an edit may come back a little longer or shorter, so everything after it moves)
  const parts: { video: typeof wholeVideo; audio: typeof wholeAudio; start: number; end: number; at: number }[] = [];
  let read = 0;
  let at = 0;
  for (const edit of edited) {
    parts.push({ video: wholeVideo, audio: wholeAudio, start: read, end: edit.from, at });
    at += Math.max(0, edit.from - read);
    parts.push({ video: edit.video, audio: edit.audio, start: 0, end: edit.seconds, at });
    at += edit.seconds;
    read = edit.to;
  }
  parts.push({ video: wholeVideo, audio: wholeAudio, start: read, end: total, at });
  const kept = parts.filter((p) => p.end - p.start > EDGE);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  for (const part of kept) {
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
  if (audioOut && firstAudio) {
    const sampleRate = await firstAudio.getSampleRate();
    const numberOfChannels = await firstAudio.getNumberOfChannels();
    for (const part of kept) {
      if (!part.audio) {
        // One-second blocks of silence, so the parts after it keep their place
        for (let t = 0; t < part.end - part.start - 1e-3; t += 1) {
          const frames = Math.round(Math.min(1, part.end - part.start - t) * sampleRate);
          const silence = new mb.AudioSample({
            data: new Float32Array(frames * numberOfChannels),
            format: "f32-planar",
            numberOfChannels,
            sampleRate,
            timestamp: part.at + t,
          });
          await audioOut.add(silence);
          silence.close();
        }
        continue;
      }
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
