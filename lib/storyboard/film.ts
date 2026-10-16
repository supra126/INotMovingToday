import type { AudioMode } from "@/types";
import type { ScriptShot, StoryboardProject } from "./types";

/** One-take film: the whole storyboard as one video, generated in segments and extended */
export const FILM_MIN_SECONDS = 15;
export const FILM_MAX_SECONDS = 40;
// Omni makes 3-10 seconds per generation or extension
const SEGMENT_MIN = 3;
const SEGMENT_MAX = 10;

export interface FilmOptions {
  audioMode: AudioMode;
  /** Let the model draw the storyboard's on-screen text (small text often comes out wrong) */
  withText: boolean;
}

export interface FilmSegment<T extends ScriptShot = ScriptShot> {
  shots: T[];
  /** Seconds this segment asks for */
  seconds: number;
  /** Where it starts in the film */
  start: number;
}

const clamp = (n: number) => Math.max(SEGMENT_MIN, Math.min(SEGMENT_MAX, Math.round(n)));
const rawSeconds = (shots: ScriptShot[]) => shots.reduce((sum, s) => sum + s.seconds, 0);

/** Pack shots in order into segments of at most 10 seconds */
export function planFilm<T extends ScriptShot>(shots: T[]): FilmSegment<T>[] {
  const groups: T[][] = [];
  for (const shot of shots) {
    const current = groups[groups.length - 1];
    if (current && rawSeconds(current) + shot.seconds <= SEGMENT_MAX) current.push(shot);
    else groups.push([shot]);
  }
  let start = 0;
  return groups.map((group) => {
    const segment = { shots: group, seconds: clamp(rawSeconds(group)), start };
    start += segment.seconds;
    return segment;
  });
}

export const filmSeconds = (plan: FilmSegment[]) => plan.reduce((sum, s) => sum + s.seconds, 0);

const fmt = (n: number) => String(Math.round(n * 10) / 10);

function shotLine(shot: ScriptShot, from: number, to: number, options: FilmOptions): string {
  const parts = [
    `畫面：${shot.visual}`,
    shot.camera && `運鏡：${shot.camera}`,
    shot.sound && `音效：${shot.sound}`,
    options.audioMode === "sfx_music" && shot.music && `配樂：${shot.music}`,
    shot.transition && `轉場：${shot.transition}`,
    options.withText && shot.onScreenText && `字卡：「${shot.onScreenText}」`,
  ];
  return `[${fmt(from)}-${fmt(to)}s] ${parts.filter(Boolean).join("；")}`;
}

/**
 * The storyboard rows of one segment as timecoded text, the way a whole table pasted into Gemini works.
 * Timecodes are relative to the segment; rows are stretched or squeezed to fit its length.
 */
export function filmSegmentPrompt(
  project: StoryboardProject,
  segment: FilmSegment,
  index: number,
  options: FilmOptions
): string {
  const raw = rawSeconds(segment.shots);
  const scale = raw > 0 ? segment.seconds / raw : 1;
  let at = 0;
  const lines = segment.shots.map((shot) => {
    const from = at;
    at += shot.seconds * scale;
    return shotLine(shot, from, at, options);
  });

  const intro =
    index === 0
      ? `一支${project.tone ? `${project.tone}的` : ""}廣告影片的開頭 ${segment.seconds} 秒。依時間碼拍成多個鏡頭，鏡頭之間依轉場自然銜接，像剪好的成片；第一個畫面照參考圖。`
      : `接續前面的影片往下發展，再加 ${segment.seconds} 秒。第一個鏡頭要從前一段的結尾自然轉場過來，畫面照參考圖；之後依時間碼切換鏡頭。`;
  const notes = [
    segment.shots.some((s) => s.hasPackaging) && "產品包裝的外觀和上面的文字照參考圖，不要改動。",
    !options.withText && "畫面上不要出現任何字幕、字卡或標題文字。",
  ];
  return [intro, ...lines, ...notes.filter(Boolean)].join("\n");
}
