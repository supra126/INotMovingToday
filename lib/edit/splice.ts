/** Seconds this close to an end count as the end, so no sliver of a frame is kept */
const EDGE = 0.05;

/**
 * Put an edited part back into the whole video: the untouched parts before and after it are kept.
 * Every part goes through the same browser encoder so they join without re-encoding.
 */
export async function spliceEdit(whole: Blob, from: number, to: number, total: number, edited: Blob): Promise<Blob> {
  const { hasAudio, trimClip } = await import("@/lib/storyboard/clips");
  const { concatVideos } = await import("@/lib/storyboard/export");
  // Omni adds sound; a silent source keeps the edited part silent too, or the parts would not join
  const silent = !(await hasAudio(whole));
  const parts = [
    ...(from > EDGE ? [await trimClip(whole, { from: 0, to: from })] : []),
    await trimClip(edited, undefined, undefined, { dropAudio: silent }),
    ...(to < total - EDGE ? [await trimClip(whole, { from: to })] : []),
  ];
  return parts.length === 1 ? parts[0] : concatVideos(parts);
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
