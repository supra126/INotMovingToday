/**
 * A video plan the user can read and edit before anything is generated: one style line, then
 * timecoded shots ("0–3s：…"). Written by AI from a reference video, generated part by part.
 */
export interface TimelineShot {
  start: number;
  end: number;
  text: string;
}

export interface Timeline {
  /** Colors, light, texture and sound for the whole video */
  style: string;
  shots: TimelineShot[];
  /** Lines that start like a shot (with a number) but could not be read */
  unreadable?: string[];
}

// Omni makes 3–10 s per generation
const MAX_PIECE = 10;
const MIN_PIECE = 3;

const STYLE_LABEL = "風格：";
const SHOT_LINE = /^\s*(\d+(?:\.\d+)?)\s*[–—~\-－]\s*(\d+(?:\.\d+)?)\s*(?:s|秒)?\s*[：:]\s*(.+?)\s*$/i;

const num = (n: number) => String(+n.toFixed(1));

/** The plan as editable text */
export function formatTimeline(timeline: Timeline): string {
  return [
    timeline.style && `${STYLE_LABEL}${timeline.style}`,
    ...timeline.shots.map((s) => `${num(s.start)}–${num(s.end)}s：${s.text}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Read edited text back: timecoded lines are shots, everything else is style */
export function parseTimeline(text: string): Timeline {
  const style: string[] = [];
  const shots: TimelineShot[] = [];
  const unreadable: string[] = [];
  for (const line of text.split("\n")) {
    const match = SHOT_LINE.exec(line);
    if (match) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (end > start) shots.push({ start, end, text: match[3] });
      else unreadable.push(line.trim());
    } else if (/^\s*\d/.test(line)) {
      unreadable.push(line.trim());
    } else if (line.trim()) {
      style.push(line.trim().replace(/^風格[：:]\s*/, ""));
    }
  }
  shots.sort((a, b) => a.start - b.start);
  return { style: style.join(" "), shots, ...(unreadable.length ? { unreadable } : {}) };
}

/** How long the plan runs */
export function timelineSeconds(timeline: Timeline): number {
  return timeline.shots.reduce((end, s) => Math.max(end, s.end), 0);
}

/** Whether the shots run back to back from 0 s: a gap or an overlap leaves a stretch with no direction or two */
export function timelineContinuous(timeline: Timeline): boolean {
  let at = 0;
  for (const shot of timeline.shots) {
    if (Math.abs(shot.start - at) > 0.05) return false;
    at = shot.end;
  }
  return timeline.shots.length > 0 && !timeline.unreadable?.length;
}

/**
 * Where to cut the plan into generations of 3–10 s: as few as possible, each cut on a shot boundary
 * when one is close enough, so no shot is split across two generations
 */
export function timelineCuts(timeline: Timeline): number[] {
  // Generations are whole seconds; a plan ending on a half second gets the second it needs
  const total = Math.ceil(timelineSeconds(timeline) - 1e-6);
  const count = Math.max(1, Math.ceil(total / MAX_PIECE));
  // Only whole-second boundaries can be cut on, so a half-second shot end is never split
  const bounds = timeline.shots.map((s) => s.end).filter((b) => Number.isInteger(b) && b > 0 && b < total);
  const cuts = [0];
  for (let k = 1; k < count; k++) {
    const prev = cuts[k - 1];
    const left = count - k;
    // This piece is 3–10 s, and what is left can still be split into `left` pieces of 3–10 s
    const lo = Math.max(prev + MIN_PIECE, total - left * MAX_PIECE);
    const hi = Math.min(prev + MAX_PIECE, total - left * MIN_PIECE);
    const ideal = Math.round(prev + (total - prev) / (left + 1));
    const onShot = bounds.filter((b) => b >= lo && b <= hi).sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];
    cuts.push(onShot ?? Math.min(hi, Math.max(lo, ideal)));
  }
  cuts.push(total);
  return cuts;
}

/** The shots between two cuts, timed from the start of that piece */
export function timelineSlice(timeline: Timeline, from: number, to: number): Timeline {
  return {
    style: timeline.style,
    shots: timeline.shots
      .filter((s) => s.end > from + 0.05 && s.start < to - 0.05)
      .map((s) => ({ start: Math.max(0, s.start - from), end: Math.min(to, s.end) - from, text: s.text })),
  };
}
