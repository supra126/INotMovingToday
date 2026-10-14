import { zipSync, type Zippable } from "fflate";
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

async function openClip(blob: Blob) {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const video = await input.getPrimaryVideoTrack();
  const audio = await input.getPrimaryAudioTrack();
  if (!video?.codec) throw new Error("errors.mergeMismatch");
  return {
    video,
    audio,
    videoConfig: await video.getDecoderConfig(),
    audioConfig: audio ? await audio.getDecoderConfig() : null,
    duration: await video.computeDuration(),
  };
}

type Clip = Awaited<ReturnType<typeof openClip>>;

function sameBytes(a?: AllowSharedBufferSource, b?: AllowSharedBufferSource): boolean {
  if (!a || !b) return a === b;
  const bytes = (v: AllowSharedBufferSource) =>
    ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : new Uint8Array(v);
  const x = bytes(a);
  const y = bytes(b);
  return x.length === y.length && x.every((byte, i) => byte === y[i]);
}

// Packets are copied as they are, so every clip must decode with the first clip's settings
function matches(first: Clip, clip: Clip): boolean {
  return (
    clip.video.codec === first.video.codec &&
    clip.video.codedWidth === first.video.codedWidth &&
    clip.video.codedHeight === first.video.codedHeight &&
    sameBytes(clip.videoConfig?.description, first.videoConfig?.description) &&
    !!clip.audio === !!first.audio &&
    (!clip.audio ||
      (clip.audio.codec === first.audio!.codec &&
        clip.audio.sampleRate === first.audio!.sampleRate &&
        clip.audio.numberOfChannels === first.audio!.numberOfChannels))
  );
}

/**
 * Join clips end to end by copying their encoded packets: fast and lossless.
 * Throws "errors.mergeMismatch" when the clips were encoded differently (e.g. 720p next to 1080p).
 */
export async function concatVideos(blobs: Blob[]): Promise<Blob> {
  const clips = await Promise.all(blobs.map(openClip));
  const [first] = clips;
  if (!first || clips.some((clip) => !matches(first, clip))) throw new Error("errors.mergeMismatch");

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const videoSource = new EncodedVideoPacketSource(first.video.codec!);
  output.addVideoTrack(videoSource, { rotation: first.video.rotation });
  const audioSource = first.audio?.codec ? new EncodedAudioPacketSource(first.audio.codec) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  let offset = 0;
  // Audio must never step back into the previous clip
  let lastAudio = -Infinity;
  for (const [i, clip] of clips.entries()) {
    let firstPacket = i === 0;
    for await (const packet of new EncodedPacketSink(clip.video).packets()) {
      const meta = firstPacket && clip.videoConfig ? { decoderConfig: clip.videoConfig } : undefined;
      await videoSource.add(packet.clone({ timestamp: packet.timestamp + offset }), meta);
      firstPacket = false;
    }
    if (audioSource && clip.audio) {
      firstPacket = i === 0;
      for await (const packet of new EncodedPacketSink(clip.audio).packets()) {
        // Audio past the end of its own clip would overlap the next one
        if (packet.timestamp >= clip.duration) break;
        // AAC priming sits before 0; the real audio starts at 0
        if (packet.timestamp < 0) continue;
        const timestamp = packet.timestamp + offset;
        if (timestamp <= lastAudio) continue;
        const meta = firstPacket && clip.audioConfig ? { decoderConfig: clip.audioConfig } : undefined;
        await audioSource.add(packet.clone({ timestamp }), meta);
        lastAudio = timestamp;
        firstPacket = false;
      }
    }
    offset += clip.duration;
  }

  await output.finalize();
  return new Blob([target.buffer!], { type: "video/mp4" });
}

/** Pack the files uncompressed: MP4 is already compressed */
export async function zipVideos(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const zippable: Zippable = {};
  for (const { name, blob } of files) zippable[name] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  return new Blob([zipSync(zippable)], { type: "application/zip" });
}
