import type { AudioMode, VideoResolution } from "@/types";
import type { ScriptShot, Shot, StoryboardProject } from "./types";

/** One-take film: the whole storyboard as one video, generated in segments and extended */
export const FILM_MIN_SECONDS = 15;
// Docs say 40 s, but tested 2026-10-16: 24→30 s works, 28→31 s fails with a generic 400
export const FILM_MAX_SECONDS = 30;
// Omni makes 3-10 seconds per generation or extension
const SEGMENT_MIN = 3;
const SEGMENT_MAX = 10;

export interface FilmOptions {
  audioMode: AudioMode;
  /** Let the model draw the storyboard's on-screen text (small text often comes out wrong) */
  withText: boolean;
  /** 720p or 1080p: both tested with extensions (2026-10-16); 4K was not */
  resolution: VideoResolution;
  /** Film length; the storyboard's seconds are stretched or squeezed to fit. Unset = the table's own total */
  seconds?: number;
  /**
   * "smooth" (default): every segment flows out of the previous one with a continuous camera move,
   * no cuts or fades. "table": follow the storyboard's own transitions (e.g. hard cuts)
   */
  transitions?: "smooth" | "table";
}

export const FILM_LENGTHS = [15, 20, 25, 30];

export const FILM_RESOLUTIONS: VideoResolution[] = ["720p", "1080p"];

export interface FilmSegment<T extends ScriptShot = ScriptShot> {
  shots: T[];
  /** Seconds this segment asks for */
  seconds: number;
  /** Where it starts in the film */
  start: number;
}

const clamp = (n: number) => Math.max(SEGMENT_MIN, Math.min(SEGMENT_MAX, Math.round(n)));
const rawSeconds = (shots: ScriptShot[]) => shots.reduce((sum, s) => sum + s.seconds, 0);

/**
 * One segment per shot, so every shot's own frame is sent and every seam follows its Transition cell.
 * With a target length every shot is scaled by the same factor first.
 */
export function planFilm<T extends ScriptShot>(shots: T[], target?: number): FilmSegment<T>[] {
  const raw = rawSeconds(shots);
  const factor = target && raw > 0 ? target / raw : 1;
  const scaled = (group: T[]) => rawSeconds(group) * factor;
  const groups: T[][] = shots.map((shot) => [shot]);
  // Whole seconds within 3-10 per segment that add up to the target, or as close as the bounds allow.
  // Rounding first and clamping after would change the total (two 3 s shots asked for 30 s gave 20 s
  // shown as 30); here the bounds are applied first and the seconds left are moved to the best fits.
  const exact = groups.map(scaled);
  const seconds = exact.map((e) => clamp(e));
  let total = seconds.reduce((a, b) => a + b, 0);
  // A chosen length is met as closely as the bounds allow; without one, the table's seconds stand,
  // each kept within the bounds (a 2 s shot becomes 3 s without taking a second from the others)
  const bounded = (e: number) => Math.max(SEGMENT_MIN, Math.min(SEGMENT_MAX, e));
  const goal = target
    ? Math.min(SEGMENT_MAX * groups.length, Math.max(SEGMENT_MIN * groups.length, Math.round(target)))
    : Math.round(exact.reduce((a, e) => a + bounded(e), 0));
  while (total !== goal) {
    const up = total < goal;
    // The segment furthest below (or above) its exact share that still has room
    let best = -1;
    for (let i = 0; i < seconds.length; i++) {
      if (up ? seconds[i] >= SEGMENT_MAX : seconds[i] <= SEGMENT_MIN) continue;
      const gap = exact[i] - seconds[i];
      if (best < 0 || (up ? gap > exact[best] - seconds[best] : gap < exact[best] - seconds[best])) best = i;
    }
    if (best < 0) break;
    seconds[best] += up ? 1 : -1;
    total += up ? 1 : -1;
  }
  let start = 0;
  return groups.map((group, i) => {
    const segment = { shots: group, seconds: seconds[i], start };
    start += segment.seconds;
    return segment;
  });
}

export const filmSeconds = (plan: FilmSegment[]) => plan.reduce((sum, s) => sum + s.seconds, 0);

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** The prompt the picked AI frame was drawn from; an uploaded frame has none that describes it */
function describedFrame(shot: ScriptShot): string {
  const { imagePrompt, finalImage } = shot as Partial<Shot>;
  return finalImage && !finalImage.uploaded && imagePrompt ? imagePrompt : "";
}

// A one-word transition like 硬切 or 淡出 is left to the smooth rules; anything longer is the user's own direction
const SIMPLE_TRANSITION = /^(硬切|切|直切|淡入|淡出|淡入淡出|溶接|疊化|轉場|無|cut|hard cut|fade|fade in|fade out|dissolve|none)?$/i;
const ownTransition = (shot?: ScriptShot) => (shot && !SIMPLE_TRANSITION.test(shot.transition.trim()) ? shot.transition.trim() : "");

function shotLine(shot: ScriptShot, from: number, to: number, options: FilmOptions): string {
  const parts = [
    `畫面：${shot.visual}`,
    shot.camera && `運鏡：${shot.camera}`,
    shot.sound && `音效：${shot.sound}`,
    options.audioMode === "sfx_music" && shot.music && `配樂：${shot.music}`,
    (options.transitions === "table" ? shot.transition : ownTransition(shot)) && `轉場：${options.transitions === "table" ? shot.transition : ownTransition(shot)}`,
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
  options: FilmOptions,
  /** Last shot of the previous segment: its transition leads into this segment */
  previous?: ScriptShot
): string {
  const raw = rawSeconds(segment.shots);
  const scale = raw > 0 ? segment.seconds / raw : 1;
  let at = 0;
  const lines = segment.shots.map((shot) => {
    const from = at;
    at += shot.seconds * scale;
    return shotLine(shot, from, at, options);
  });

  const smooth = options.transitions !== "table";
  // A written transition that mentions a cut (e.g. 直接切到下一個畫面) makes a clean cut at this seam only
  const cutIn = smooth && index > 0 && ownTransition(previous).includes("切");
  const intro = cutIn
    ? `接續前面的影片再加 ${segment.seconds} 秒。這段用乾淨的硬切開始：第一格直接就是參考圖的畫面，不要從前一段過渡。`
    : smooth
    ? index === 0
      ? `一支${project.tone ? `${project.tone}的` : ""}廣告影片的開頭 ${segment.seconds} 秒，第一個畫面照參考圖。依時間碼推進，鏡頭之間只用鏡頭運動（推進、拉遠、平移）或溶接一氣呵成地過渡，像一個流暢的長鏡頭。`
      : `接續前面的影片再加 ${segment.seconds} 秒。開頭必須從前一段的最後一個畫面連續過渡，只用鏡頭運動（推進、拉遠、平移）或溶接，過渡完成後的畫面要和參考圖一致：同樣的構圖、角度、擺放、光線、色調和背景。參考圖是這段要轉到的目標，不是第一格。`
    : index === 0
      ? `一支${project.tone ? `${project.tone}的` : ""}廣告影片的開頭 ${segment.seconds} 秒。依時間碼拍成多個鏡頭，鏡頭之間依轉場自然銜接，像剪好的成片；第一個畫面照參考圖。`
      : `接續前面的影片往下發展，再加 ${segment.seconds} 秒。第一個鏡頭要從前一段的結尾自然轉場過來，畫面照參考圖；之後依時間碼切換鏡頭。`;
  const packaging = segment.shots.some((s) => s.hasPackaging);
  // The picked frame may have been regenerated with a changed prompt (e.g. orange light) or uploaded,
  // so the storyboard text can disagree with it; the frame wins
  const frameNote = describedFrame(segment.shots[0]);
  const notes = [
    "畫面的構圖、角度、擺放、光線、色調和背景以參考圖為準；文字跟參考圖不同時照參考圖，文字只用來說明動作、運鏡和聲音。",
    frameNote && `參考圖內容：${frameNote}`,
    (segment.shots[0] as Partial<Shot>).finalImage?.uploaded &&
      "參考圖是指定的最終畫面：主體的位置、大小、擺放角度和周圍物件都要完全照它，不要改成置中或正面。",
    `全片的風格、色調和光線前後一致${project.tone ? `（${project.tone}）` : ""}。`,
    packaging
      ? "產品包裝的外觀和上面的文字照參考圖，不要改動；除了參考圖裡的產品，不要出現其他產品、瓶罐或品牌。"
      : "這段不要出現任何產品、包裝、瓶罐、標籤或品牌名稱，也不要自己發明產品。",
    !options.withText && "畫面上不要出現任何字幕、字卡或標題文字。",
    smooth &&
      `${cutIn ? "除了開頭的硬切，" : "全段"}不要硬切，不要淡入淡出，不要黑場；結尾停在動作進行中，方便下一段接續。`,
    smooth && "過渡時不要讓一個物體變形成另一個物體，也不要冒出分鏡表沒有的東西。",
    "只拍分鏡表寫到的內容；不要自行加入分鏡表沒提到的特效，例如光芒、光束、光暈、流光、閃光、煙霧、粒子漩渦。",
  ];
  const lead = smooth && !cutIn && index > 0 && ownTransition(previous) && `開頭的過渡方式照這個做：${ownTransition(previous)}`;
  return [intro, ...(lead ? [lead] : []), ...lines, ...notes.filter(Boolean)].join("\n");
}
