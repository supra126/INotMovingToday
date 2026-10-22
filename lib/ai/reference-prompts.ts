import type { Similarity } from "@/lib/edit/editJob";
import type { Timeline, TimelineShot } from "@/lib/edit/timeline";

export interface ReferencePlanInput {
  similarity: Similarity;
  /** Length of the new video */
  seconds: number;
  /** Length of the reference */
  referenceSeconds: number;
  /** Product photos come after the video */
  productCount: number;
  instruction: string;
}

/**
 * How much of the reference the plan follows; the AI judges the details within these bounds.
 * Same levels as IGiveUpOnLife's similar-image tool, with the shot rhythm added for video
 */
const LEVELS: Record<Similarity, string> = {
  high: "高：幾乎照抄參考影片。鏡頭順序、每個鏡頭拍的內容、運鏡、構圖、色系、光線、質感、剪輯節奏都照參考影片，只把主角換成我們的產品。",
  medium:
    "中：同樣的質感與氛圍，但是新的鏡頭。照參考影片的色系、光線、質感、剪輯節奏（鏡頭數量、長短比例、轉場方式）與背景風格；每個鏡頭拍的內容、構圖、運鏡角度、道具重新設計，但要是同一類的畫面。",
  low: "低：只借參考影片的色系與整體氛圍當情緒板。剪輯節奏、場景、光線、構圖、鏡頭內容全部重新發想，成品不能像參考影片的翻拍。",
};

/** Ask Gemini to watch the reference and write a timecoded plan of the requested length */
export function buildReferencePlanPrompt(input: ReferencePlanInput): string {
  const product =
    input.productCount > 0
      ? `影片後面附了 ${input.productCount} 張我們的產品圖，新影片的主角是這個產品。描述產品時只寫「參考圖的產品」和它的擺放、動作，不要描述包裝上的字。產品出現在參考影片主角出現的位置，其他鏡頭照參考影片原本的內容類型。`
      : "沒有附產品圖：主角跟參考影片相同。";
  return [
    "你是廣告短片導演。先仔細看這支參考影片，再為一支新影片寫拍攝時間軸，給 AI 影片模型照著拍。",
    `參考影片長 ${Math.round(input.referenceSeconds * 10) / 10} 秒，新影片要剛好 ${input.seconds} 秒。`,
    `相似度 ${LEVELS[input.similarity]}`,
    "依相似度自己判斷要模仿到什麼程度。新影片比參考影片長時，照相似度決定是把參考影片的鏡頭按比例放慢拉長，還是重新分配鏡頭；不要用重複的鏡頭湊秒數。",
    product,
    input.instruction.trim() ? `使用者補充（優先照做）：${input.instruction.trim()}` : "",
    [
      "輸出 JSON：",
      '{"style": "一段話：整支的色系、光線、質感、聲音與音樂", "shots": [{"start": 0, "end": 3, "text": "這個鏡頭拍什麼、怎麼動、運鏡"}]}',
      `- shots 從 0 秒接到 ${input.seconds} 秒，前後相接不重疊，每個鏡頭至少 1 秒，秒數用整數或 0.5。`,
      "- text 用繁體中文，具體寫畫面與運鏡，一個鏡頭一兩句。",
      "- 畫面上不要加任何文字、標題或字幕；不要寫參考影片原本的品牌或產品名稱。",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Read the plan, closing gaps and fitting it to the requested length */
export function parseReferencePlan(raw: unknown, seconds: number): Timeline {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(data.shots) ? data.shots : [];
  const shots: TimelineShot[] = [];
  for (const row of rows) {
    const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const text = str(r.text);
    const start = Number(r.start);
    const end = Number(r.end);
    if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    shots.push({ start, end, text });
  }
  if (shots.length === 0) throw new Error("Failed to parse AI response: no shots");
  shots.sort((a, b) => a.start - b.start);
  // Back to back from 0, scaled to the requested length if the AI missed it
  const scale = seconds / shots[shots.length - 1].end;
  let at = 0;
  const fitted = shots.map((s, i) => {
    const end = i === shots.length - 1 ? seconds : Math.round(s.end * scale * 2) / 2;
    const shot = { start: at, end: Math.max(at + 0.5, end), text: s.text };
    at = shot.end;
    return shot;
  });
  return { style: str(data.style), shots: fitted };
}
