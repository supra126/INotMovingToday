# 分鏡模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/storyboard` 新增分鏡模式：腳本（圖或文字）→ 分鏡表 → 分鏡圖 → 每鏡批次生影片，全部在瀏覽器裡用使用者自己的 Gemini key 完成。

**Architecture:** 純邏輯（分鏡資料轉換、費用、prompt 組裝與解析、併發佇列）放在 `lib/`，用 Vitest 測。AI 呼叫沿用現有的 static / server 雙路徑（`services/`），生圖一律在瀏覽器直接呼叫。專案存在 IndexedDB，頁面是四個步驟元件，共用一個 `useStoryboardProject` hook。單鏡模式的生成流程抽成 `lib/video/job.ts`，兩個模式共用。

**Tech Stack:** Next.js 16.4（App Router，client components）、React 19.3、TypeScript 5.9、Tailwind 4、`@google/genai` 2.28、zod 4、Vitest（新增）、原生 IndexedDB。

**Spec:** `docs/superpowers/specs/2026-10-13-storyboard-mode-design.md`

## Global Constraints

- 比例只有 `9:16` 或 `16:9`，在 ① 設定，分鏡表確認後鎖定；分鏡圖與影片都用同一比例。
- 候選圖固定 `1K`，每鏡 2 張；定稿尺寸 `1K` / `2K` / `4K`，預設 `1K`（1K 不重出、不收費）。
- 生圖模型 `gemini-nano-banana-2.1`；單價 1K $0.0336、2K $0.0504、4K $0.113（Gemini API 定價頁，2026-10-13）。影片 720p 每秒 $0.10，1080p / 4K 顯示「起」。
- 併發上限：生圖 4、生影片 3、AI 填欄位 4；遇到 429 / rate limit 延遲後重試，最多 2 次，不影響其他工作。
- 分鏡模式一律需要使用者自己的 key（生圖從瀏覽器直接呼叫）；沒有 key 時開啟 API key 設定視窗。
- 分鏡模式的音訊預設 `sfx`（只有音效）。
- 「畫面文字」只記錄在分鏡表，不畫進圖片或影片。
- 每鏡 3–10 秒；影片長度取 `[4, 6, 8, 10]` 中大於等於分鏡秒數的最小值。
- 介面文字一律走 `locales/zh.json` / `locales/en.json`，不寫死字串。
- 單鏡模式（`/`）行為不變。
- 這個分支只在本地，不 push。
- ESLint（`eslint-config-next` 16）若對 effect 內 setState 等新規則報錯，照規則訊息調整寫法，不要整檔停用規則。

## Review Focus

1. 生成途中重新整理頁面：圖片狀態回到 `idle`、影片標成 `interrupted`，不會永遠卡在「生成中」（Task 1 `normalizeOnLoad` 測試）。
2. 分鏡表在出圖後被修改：該鏡標為過期、清掉生圖 prompt，④ 的關卡擋住過期鏡頭（Task 1 `applyScriptEdit` / `canEnterStep` 測試）。
3. AI 回傳的分鏡表格式不乾淨（秒數寫成 `"4秒"`、鏡號缺漏、超過 10 秒、欄位缺）：正規化後仍可用（Task 4 測試）。
4. 某一鏡失敗或撞到 429：其他鏡照常完成，失敗的鏡頭可重試（Task 7 測試）。
5. 影片網址無法下載成 Blob（mock 的遠端網址、CORS）：保留網址照樣可播放，不當成失敗（Task 14 `toStoredVideo` 測試）。

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `vitest.config.ts` | Vitest 設定（`@/` alias、Node 環境） |
| `types/index.ts` | 新增 `ImageSize` |
| `lib/storyboard/types.ts` | 分鏡專案的資料型別 |
| `lib/storyboard/shots.ts` | 純函式：秒數、結束畫面預設、合併分鏡表、過期、關卡、檔名 |
| `lib/pricing.ts` | 影片與圖片單價、費用計算（`PriceEstimate` 也改用） |
| `lib/ai/image-prompts.ts` | 從 `feat/cli:cli/image-prompts.ts` 搬來，加包裝文字與定稿重出 |
| `lib/ai/storyboard-prompts.ts` | 分鏡表的提示詞與回應解析 |
| `lib/ai/gemini-client.ts` | 新增 `parseScript` / `reviseScript` / `writeImagePrompts` / `rewriteImagePrompt` |
| `app/actions/server/storyboard.ts` | 上述方法的 server actions |
| `services/storyboardService.ts` | static / server 雙路徑 |
| `lib/storyboard/blob.ts` | Blob ↔ base64 |
| `services/imageService.ts` | 瀏覽器直接呼叫 Nano Banana |
| `lib/storyboard/queue.ts` | 併發佇列與 429 重試 |
| `lib/video/errors.ts`、`lib/video/crop.ts`、`lib/video/job.ts` | 從 `useVideoGeneration` 抽出的共用生成流程 |
| `lib/storyboard/storage.ts` | IndexedDB |
| `hooks/useStoryboardProject.ts` | 專案載入、更新、儲存 |
| `lib/storyboard/imageJobs.ts` | 候選圖、重生、定稿的流程 |
| `lib/storyboard/videoJobs.ts` | 填欄位、批次生影片、延伸的流程 |
| `components/storyboard/*` | 頁面元件 |
| `app/storyboard/page.tsx` | 頁面 |

---

### Task 1: Vitest、分鏡資料型別與純函式

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`（scripts、devDependencies）
- Modify: `types/index.ts`
- Create: `lib/storyboard/types.ts`
- Create: `lib/storyboard/shots.ts`
- Test: `lib/storyboard/shots.test.ts`

**Interfaces:**
- Produces: 型別 `ImageSize`、`StoredImage`、`ChatMessage`、`ScriptShot`、`Shot`、`EndFrame`、`ShotVideo`、`StoryboardProject`、`ProjectSummary`、`Step`；函式 `snapDuration`、`defaultEndFrame`、`toShot`、`applyScriptEdit`、`mergeScriptShots`、`normalizeOnLoad`、`endFrameImage`、`canEnterStep`、`setFinalSize`、`selectCandidate`、`newProject`、`shotDescription`、`videoFileName`。

- [ ] **Step 1: 安裝 Vitest 並設定**

```bash
pnpm add -D vitest@^3
```

`vitest.config.ts`：

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "dist/**"],
  },
});
```

`package.json` 的 `scripts` 加上 `"test": "vitest run"`。

- [ ] **Step 2: 加型別**

`types/index.ts` 在 `AudioMode` 下面加：

```ts
// 分鏡圖尺寸（Nano Banana）
export type ImageSize = "1K" | "2K" | "4K";
```

`lib/storyboard/types.ts`：

```ts
import type {
  AudioMode,
  ImageSize,
  PromptDraft,
  PromptFields,
  VideoDuration,
  VideoRatio,
  VideoResolution,
} from "@/types";

export type Step = 1 | 2 | 3 | 4;

export interface StoredImage {
  blob: Blob;
  mimeType: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  at: number;
}

/** One row of the storyboard table, as the AI and the user edit it */
export interface ScriptShot {
  id: string; // "s01"
  seconds: number;
  visual: string;
  camera: string;
  sound: string;
  music: string;
  onScreenText: string;
  transition: string;
  hasPackaging: boolean;
}

export type EndFrame = { kind: "none" } | { kind: "next" } | { kind: "upload"; image: StoredImage };

export type ShotVideoStatus = "generating" | "completed" | "failed" | "interrupted";

export interface ShotVideo {
  status: ShotVideoStatus;
  progress: number;
  /** English prompt sent to Omni */
  prompt: string;
  blob?: Blob;
  /** Used when the video could not be downloaded as a Blob (e.g. remote mock URL) */
  url?: string;
  sourceVideoUri?: string;
  duration: number;
  error?: string;
}

export interface Shot extends ScriptShot {
  /** English Nano Banana prompt; empty until the storyboard is confirmed */
  imagePrompt: string;
  candidates: StoredImage[];
  selected?: number;
  finalImage?: StoredImage;
  /** The storyboard row changed after images were made */
  stale: boolean;
  imageStatus: "idle" | "generating" | "failed";
  imageError?: string;
  duration: VideoDuration;
  endFrame: EndFrame;
  draft?: PromptDraft;
  fields?: PromptFields;
  video?: ShotVideo;
}

export interface StoryboardProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ratio: VideoRatio;
  tone: string;
  packagingText: string;
  productImages: StoredImage[];
  script: {
    sourceImage?: StoredImage;
    sourceText: string;
    chat: ChatMessage[];
    suggestions: string[];
    confirmed: boolean;
  };
  shots: Shot[];
  finalSize: ImageSize;
  videoSettings: { resolution: VideoResolution; audioMode: AudioMode };
  step: Step;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  step: Step;
}
```

- [ ] **Step 3: 寫失敗的測試**

`lib/storyboard/shots.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  applyScriptEdit,
  canEnterStep,
  defaultEndFrame,
  endFrameImage,
  mergeScriptShots,
  newProject,
  normalizeOnLoad,
  selectCandidate,
  setFinalSize,
  shotDescription,
  snapDuration,
  toShot,
  videoFileName,
} from "./shots";
import type { ScriptShot, StoredImage } from "./types";

const img = (name: string): StoredImage => ({ blob: new Blob([name]), mimeType: "image/png" });

const row = (over: Partial<ScriptShot> = {}): ScriptShot => ({
  id: "s01",
  seconds: 4,
  visual: "黑色布膜展開",
  camera: "慢推",
  sound: "布料聲",
  music: "無",
  onScreenText: "這片黑，很有料！",
  transition: "硬切",
  hasPackaging: false,
  ...over,
});

describe("snapDuration", () => {
  it("rounds up to the nearest Omni length", () => {
    expect(snapDuration(3)).toBe(4);
    expect(snapDuration(4)).toBe(4);
    expect(snapDuration(4.5)).toBe(6);
    expect(snapDuration(9)).toBe(10);
    expect(snapDuration(15)).toBe(10);
  });
});

describe("defaultEndFrame", () => {
  it("uses the next shot for continuous transitions", () => {
    expect(defaultEndFrame("溶接", false)).toEqual({ kind: "next" });
    expect(defaultEndFrame("match cut transition", false)).toEqual({ kind: "next" });
  });
  it("uses none for hard cuts and the last shot", () => {
    expect(defaultEndFrame("硬切", false)).toEqual({ kind: "none" });
    expect(defaultEndFrame("溶接", true)).toEqual({ kind: "none" });
    expect(defaultEndFrame("", false)).toEqual({ kind: "none" });
  });
});

describe("applyScriptEdit", () => {
  it("marks a shot with images stale and clears its prompt when the picture changes", () => {
    const shot = { ...toShot(row(), false), imagePrompt: "prompt", candidates: [img("a")], selected: 0 };
    const next = applyScriptEdit(shot, row({ visual: "布膜貼臉" }), false);
    expect(next.stale).toBe(true);
    expect(next.imagePrompt).toBe("");
    expect(next.candidates).toHaveLength(1);
  });
  it("keeps images fresh when only on-screen text changes", () => {
    const shot = { ...toShot(row(), false), imagePrompt: "prompt", candidates: [img("a")] };
    const next = applyScriptEdit(shot, row({ onScreenText: "新字卡" }), false);
    expect(next.stale).toBe(false);
    expect(next.imagePrompt).toBe("prompt");
  });
  it("re-snaps the duration when seconds change", () => {
    const next = applyScriptEdit(toShot(row(), false), row({ seconds: 7 }), false);
    expect(next.duration).toBe(8);
  });
});

describe("mergeScriptShots", () => {
  it("adds new rows, keeps matching rows and drops removed rows", () => {
    const prev = [{ ...toShot(row(), false), imagePrompt: "p1" }, toShot(row({ id: "s02" }), true)];
    const merged = mergeScriptShots(prev, [row(), row({ id: "s03", visual: "產品" })]);
    expect(merged.map((s) => s.id)).toEqual(["s01", "s03"]);
    expect(merged[0].imagePrompt).toBe("p1");
    expect(merged[1].candidates).toEqual([]);
  });
});

describe("normalizeOnLoad", () => {
  it("resets work that was running when the page closed", () => {
    const p = newProject("id", 0);
    p.shots = [
      {
        ...toShot(row(), true),
        imageStatus: "generating",
        video: { status: "generating", progress: 40, prompt: "x", duration: 4 },
      },
    ];
    const loaded = normalizeOnLoad(p);
    expect(loaded.shots[0].imageStatus).toBe("idle");
    expect(loaded.shots[0].video?.status).toBe("interrupted");
  });
});

describe("canEnterStep", () => {
  it("gates each step", () => {
    const p = newProject("id", 0);
    expect(canEnterStep(p, 2)).toBe(false);
    p.productImages = [img("product")];
    expect(canEnterStep(p, 2)).toBe(true);
    p.shots = [{ ...toShot(row(), true), imagePrompt: "p" }];
    expect(canEnterStep(p, 3)).toBe(false);
    p.script.confirmed = true;
    expect(canEnterStep(p, 3)).toBe(true);
    expect(canEnterStep(p, 4)).toBe(false);
    p.shots[0] = { ...p.shots[0], finalImage: img("final") };
    expect(canEnterStep(p, 4)).toBe(true);
    p.shots[0] = { ...p.shots[0], stale: true };
    expect(canEnterStep(p, 4)).toBe(false);
  });
});

describe("selectCandidate / setFinalSize", () => {
  it("uses the candidate as the final image at 1K only", () => {
    const shot = { ...toShot(row(), true), candidates: [img("a"), img("b")], stale: true };
    const picked = selectCandidate(shot, 1, "1K");
    expect(picked.finalImage).toBe(shot.candidates[1]);
    expect(picked.stale).toBe(false);
    expect(selectCandidate(shot, 1, "2K").finalImage).toBeUndefined();
  });
  it("resets final images when the size changes", () => {
    const p = newProject("id", 0);
    p.shots = [{ ...toShot(row(), true), candidates: [img("a")], selected: 0, finalImage: img("2k") }];
    p.finalSize = "2K";
    const at1k = setFinalSize(p, "1K");
    expect(at1k.shots[0].finalImage).toBe(p.shots[0].candidates[0]);
    expect(setFinalSize(p, "4K").shots[0].finalImage).toBeUndefined();
  });
});

describe("endFrameImage", () => {
  it("resolves next / upload / none", () => {
    const a = { ...toShot(row(), false), endFrame: { kind: "next" as const } };
    const b = { ...toShot(row({ id: "s02" }), true), finalImage: img("b") };
    expect(endFrameImage([a, b], 0)).toBe(b.finalImage);
    expect(endFrameImage([b], 0)).toBeUndefined();
    const up = img("up");
    expect(endFrameImage([{ ...a, endFrame: { kind: "upload", image: up } }], 0)).toBe(up);
  });
});

describe("shotDescription / videoFileName", () => {
  it("describes the shot for the field draft", () => {
    expect(shotDescription(toShot(row(), true))).toContain("黑色布膜展開");
    expect(shotDescription(toShot(row(), true))).not.toContain("這片黑");
  });
  it("builds a safe file name", () => {
    expect(videoFileName(toShot(row({ visual: "布膜/貼合:臉部 展現高度服貼力很長很長" }), true))).toBe(
      "s01-布膜貼合臉部展現高度.mp4"
    );
  });
});
```

- [ ] **Step 4: 跑測試確認失敗**

Run: `pnpm test lib/storyboard/shots.test.ts`
Expected: FAIL，`Failed to resolve import "./shots"`。

- [ ] **Step 5: 實作**

`lib/storyboard/shots.ts`：

```ts
import type { ImageSize, VideoDuration } from "@/types";
import type { EndFrame, ScriptShot, Shot, Step, StoredImage, StoryboardProject } from "./types";

const DURATIONS: VideoDuration[] = [4, 6, 8, 10];

/** Omni lengths are 4/6/8/10s; generate the next one up and trim in the editor */
export function snapDuration(seconds: number): VideoDuration {
  return DURATIONS.find((d) => d >= seconds) ?? 10;
}

const HARD_CUT = /硬切|直切|hard\s*cut/i;
const CONTINUOUS = /接續|溶接|疊化|轉場|銜接|morph|dissolve|match|continu|transition/i;

export function defaultEndFrame(transition: string, isLast: boolean): EndFrame {
  if (isLast || HARD_CUT.test(transition)) return { kind: "none" };
  return CONTINUOUS.test(transition) ? { kind: "next" } : { kind: "none" };
}

export function toShot(row: ScriptShot, isLast: boolean): Shot {
  return {
    ...row,
    imagePrompt: "",
    candidates: [],
    stale: false,
    imageStatus: "idle",
    duration: snapDuration(row.seconds),
    endFrame: defaultEndFrame(row.transition, isLast),
  };
}

// Columns that change what the picture shows
const PICTURE_KEYS = ["visual", "camera", "hasPackaging"] as const;

/** Apply an edited storyboard row to an existing shot */
export function applyScriptEdit(shot: Shot, row: ScriptShot, isLast: boolean): Shot {
  const pictureChanged = PICTURE_KEYS.some((key) => shot[key] !== row[key]);
  return {
    ...shot,
    ...row,
    imagePrompt: pictureChanged ? "" : shot.imagePrompt,
    stale: shot.stale || (pictureChanged && shot.candidates.length > 0),
    duration: shot.seconds === row.seconds ? shot.duration : snapDuration(row.seconds),
    endFrame: shot.transition === row.transition ? shot.endFrame : defaultEndFrame(row.transition, isLast),
  };
}

/** Replace the table with a new version from the AI, keeping images of matching shots */
export function mergeScriptShots(prev: Shot[], rows: ScriptShot[]): Shot[] {
  const byId = new Map(prev.map((shot) => [shot.id, shot]));
  return rows.map((row, index) => {
    const isLast = index === rows.length - 1;
    const old = byId.get(row.id);
    return old ? applyScriptEdit(old, row, isLast) : toShot(row, isLast);
  });
}

/** Work that was running when the page closed cannot be resumed */
export function normalizeOnLoad(project: StoryboardProject): StoryboardProject {
  return {
    ...project,
    shots: project.shots.map((shot) => ({
      ...shot,
      imageStatus: shot.imageStatus === "generating" ? "idle" : shot.imageStatus,
      video: shot.video?.status === "generating" ? { ...shot.video, status: "interrupted" } : shot.video,
    })),
  };
}

export function endFrameImage(shots: Shot[], index: number): StoredImage | undefined {
  const endFrame = shots[index]?.endFrame;
  if (!endFrame || endFrame.kind === "none") return undefined;
  if (endFrame.kind === "upload") return endFrame.image;
  return shots[index + 1]?.finalImage;
}

export function canEnterStep(project: StoryboardProject, step: Step): boolean {
  if (step === 1) return true;
  if (project.productImages.length === 0) return false;
  if (step === 2) return true;
  const scriptReady =
    project.script.confirmed && project.shots.length > 0 && project.shots.every((shot) => shot.imagePrompt);
  if (step === 3) return scriptReady;
  return scriptReady && project.shots.every((shot) => shot.finalImage && !shot.stale);
}

/** Picking a candidate accepts it, even if the row changed after it was made */
export function selectCandidate(shot: Shot, index: number, finalSize: ImageSize): Shot {
  return {
    ...shot,
    selected: index,
    stale: false,
    finalImage: finalSize === "1K" ? shot.candidates[index] : undefined,
  };
}

export function setFinalSize(project: StoryboardProject, size: ImageSize): StoryboardProject {
  return {
    ...project,
    finalSize: size,
    shots: project.shots.map((shot) => ({
      ...shot,
      finalImage: size === "1K" && shot.selected !== undefined ? shot.candidates[shot.selected] : undefined,
    })),
  };
}

export function newProject(id: string, now: number): StoryboardProject {
  return {
    id,
    name: new Date(now).toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
    ratio: "9:16",
    tone: "",
    packagingText: "",
    productImages: [],
    script: { sourceText: "", chat: [], suggestions: [], confirmed: false },
    shots: [],
    finalSize: "1K",
    videoSettings: { resolution: "720p", audioMode: "sfx" },
    step: 1,
  };
}

/** Description handed to the field draft (same input as the single-shot mode) */
export function shotDescription(shot: ScriptShot): string {
  return [
    `畫面：${shot.visual}`,
    shot.camera && `運鏡：${shot.camera}`,
    shot.sound && `音效：${shot.sound}`,
    shot.music && `配樂：${shot.music}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function videoFileName(shot: ScriptShot): string {
  const label = shot.visual.replace(/[\s\\/:*?"<>|,，。.!！]/g, "").slice(0, 10);
  return `${shot.id}${label ? `-${label}` : ""}.mp4`;
}
```

- [ ] **Step 6: 跑測試確認通過**

Run: `pnpm test lib/storyboard/shots.test.ts && npx tsc --noEmit -p .`
Expected: 全部 PASS，tsc 無輸出。

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml types/index.ts lib/storyboard
git commit -m "feat(storyboard): Add storyboard data model and shot helpers"
```

---

### Task 2: 費用計算

**Files:**
- Create: `lib/pricing.ts`
- Test: `lib/pricing.test.ts`
- Modify: `components/upload/PriceEstimate.tsx`

**Interfaces:**
- Consumes: `ImageSize`（Task 1）
- Produces: `VIDEO_PRICE_PER_SECOND_720P`、`IMAGE_PRICE`、`interface Cost { amount: number; isMinimum: boolean }`、`videoCost(seconds, resolution): Cost`、`imageCost(size, count): Cost`、`sumCosts(costs: Cost[]): Cost`、`formatUsd(amount): string`

- [ ] **Step 1: 寫失敗的測試**

`lib/pricing.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { IMAGE_PRICE, formatUsd, imageCost, sumCosts, videoCost } from "./pricing";

describe("pricing", () => {
  it("prices video per second, upscaled resolutions as a minimum", () => {
    expect(videoCost(8, "720p")).toEqual({ amount: 0.8, isMinimum: false });
    expect(videoCost(4, "1080p")).toEqual({ amount: 0.4, isMinimum: true });
  });
  it("prices images per size", () => {
    expect(imageCost("1K", 2).amount).toBeCloseTo(IMAGE_PRICE["1K"] * 2);
    expect(imageCost("4K", 1).amount).toBeCloseTo(0.113);
  });
  it("sums costs and keeps the minimum flag", () => {
    const total = sumCosts([videoCost(4, "720p"), videoCost(6, "4k")]);
    expect(total.amount).toBeCloseTo(1);
    expect(total.isMinimum).toBe(true);
    expect(sumCosts([])).toEqual({ amount: 0, isMinimum: false });
  });
  it("formats dollars", () => {
    expect(formatUsd(0.0672)).toBe("$0.07");
    expect(formatUsd(2)).toBe("$2.00");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/pricing.test.ts`
Expected: FAIL，找不到 `./pricing`。

- [ ] **Step 3: 實作**

`lib/pricing.ts`：

```ts
import type { ImageSize, VideoResolution } from "@/types";

// Gemini API pricing page, checked 2026-10-13
// Omni bills by output tokens; Google quotes ~$0.10 per second at 720p.
// 1080p / 4K are upscaled and may cost more, so they are shown as "from".
export const VIDEO_PRICE_PER_SECOND_720P = 0.1;

// gemini-nano-banana-2.1, standard tier, per image
export const IMAGE_PRICE: Record<ImageSize, number> = { "1K": 0.0336, "2K": 0.0504, "4K": 0.113 };

export interface Cost {
  amount: number;
  /** True when the real price may be higher (upscaled video) */
  isMinimum: boolean;
}

export function videoCost(seconds: number, resolution: VideoResolution): Cost {
  return { amount: VIDEO_PRICE_PER_SECOND_720P * seconds, isMinimum: resolution !== "720p" };
}

export function imageCost(size: ImageSize, count: number): Cost {
  return { amount: IMAGE_PRICE[size] * count, isMinimum: false };
}

export function sumCosts(costs: Cost[]): Cost {
  return costs.reduce((total, cost) => ({
    amount: total.amount + cost.amount,
    isMinimum: total.isMinimum || cost.isMinimum,
  }), { amount: 0, isMinimum: false });
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
```

`components/upload/PriceEstimate.tsx` 改用共用的計算（整個檔案）：

```tsx
"use client";

import type { VideoDuration, VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, videoCost } from "@/lib/pricing";

interface PriceEstimateProps {
  duration: VideoDuration;
  resolution?: VideoResolution;
}

export function PriceEstimate({ duration, resolution = "720p" }: PriceEstimateProps) {
  const { t } = useLocale();

  const cost = videoCost(duration, resolution);
  const key = cost.isMinimum ? "upload.priceEstimate.labelUpscaled" : "upload.priceEstimate.label";

  return (
    <p className="text-sm text-muted text-left">{t(key, { price: formatUsd(cost.amount) })}</p>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test && npx tsc --noEmit -p .`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/pricing.ts lib/pricing.test.ts components/upload/PriceEstimate.tsx
git commit -m "feat(pricing): Share video and image pricing"
```

---

### Task 3: 生圖提示詞（從 CLI 搬過來）

**Files:**
- Create: `lib/ai/image-prompts.ts`
- Test: `lib/ai/image-prompts.test.ts`

**Interfaces:**
- Produces: `IMAGE_MODEL`、`buildKeyframeInstruction({ prompt, ratio, refCount, index, count, packagingText? })`、`buildFinalInstruction({ prompt, ratio, productCount, packagingText? })`（以及原檔其他 export，保持不變）

- [ ] **Step 1: 從 `feat/cli` 分支複製原檔**

```bash
git show feat/cli:cli/image-prompts.ts > lib/ai/image-prompts.ts
```

- [ ] **Step 2: 寫失敗的測試**

`lib/ai/image-prompts.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { buildFinalInstruction, buildKeyframeInstruction } from "./image-prompts";

describe("buildKeyframeInstruction", () => {
  it("wraps the shot prompt and forbids added text", () => {
    const text = buildKeyframeInstruction({ prompt: "A black sheet mask unfolds", ratio: "9:16", refCount: 1, index: 0, count: 2 });
    expect(text).toContain("A black sheet mask unfolds");
    expect(text).toContain("aspect ratio 9:16");
    expect(text).toContain("Do NOT add any headline");
    expect(text).toContain("VARIATION 1 of 2");
  });
  it("asks for exact packaging text when given", () => {
    const text = buildKeyframeInstruction({
      prompt: "Product on a stone",
      ratio: "9:16",
      refCount: 1,
      index: 0,
      count: 1,
      packagingText: "PDRN 極潤修護黑面膜",
    });
    expect(text).toContain('"PDRN 極潤修護黑面膜"');
  });
});

describe("buildFinalInstruction", () => {
  it("reproduces the approved frame and keeps product fidelity", () => {
    const text = buildFinalInstruction({ prompt: "Hero shot", ratio: "16:9", productCount: 2, packagingText: "" });
    expect(text).toContain("FIRST image");
    expect(text).toContain("aspect ratio 16:9");
    expect(text).toContain("Hero shot");
    expect(text).not.toContain("PACKAGING TEXT");
  });
});
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `pnpm test lib/ai/image-prompts.test.ts`
Expected: FAIL，`buildFinalInstruction` 不存在，packaging 測試失敗。

- [ ] **Step 4: 實作**

在 `lib/ai/image-prompts.ts` 檔頭註解改為：

```ts
/**
 * Image (Nano Banana) prompts
 *
 * Copied from the CLI (feat/cli: cli/image-prompts.ts), originally ported from
 * IGiveUpOnLife (lib/gemini/prompts/similar.ts, image.ts):
 * similarity is a keep / change matrix over visual dimensions,
 * which the model follows more reliably than a one-line instruction.
 */
```

在 `buildKeyframeInstruction` 上方加：

```ts
function packagingRule(packagingText?: string): string {
  return packagingText?.trim()
    ? `PACKAGING TEXT: Any visible packaging must read exactly "${packagingText.trim()}". Copy it letter for letter from the product image; do not translate, restyle or add other text.`
    : "";
}
```

把 `buildKeyframeInstruction` 換成：

```ts
/** Free prompt, optionally guided by reference images — e.g. a storyboard keyframe */
export function buildKeyframeInstruction(options: {
  prompt: string;
  ratio: string;
  refCount: number;
  index: number;
  count: number;
  packagingText?: string;
}): string {
  const sections = [
    options.refCount
      ? `Use the ${options.refCount > 1 ? "images above" : "image above"} as visual reference: keep the subject's look, materials, lighting and color mood consistent with ${options.refCount > 1 ? "them" : "it"}.`
      : "",
    wrapUserInput("shot", options.prompt),
    variation(undefined, options.index, options.count),
    packagingRule(options.packagingText),
    `OUTPUT: aspect ratio ${options.ratio}.`,
    NO_TEXT_RULE,
    NEGATIVE_PROMPT,
  ];
  return sections.filter(Boolean).join("\n\n");
}

/** Re-render an approved storyboard frame at a higher resolution */
export function buildFinalInstruction(options: {
  prompt: string;
  ratio: string;
  productCount: number;
  packagingText?: string;
}): string {
  const sections = [
    "The FIRST image is the approved storyboard frame. Reproduce it as faithfully as possible: same composition, framing, subject, pose, lighting and colors, with more detail and sharper textures.",
    options.productCount
      ? `The other ${options.productCount > 1 ? "images show" : "image shows"} the real product: keep its shape, materials and packaging exactly as shown.`
      : "",
    wrapUserInput("shot", options.prompt),
    packagingRule(options.packagingText),
    `OUTPUT: aspect ratio ${options.ratio}.`,
    NO_TEXT_RULE,
    NEGATIVE_PROMPT,
  ];
  return sections.filter(Boolean).join("\n\n");
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `pnpm test lib/ai/image-prompts.test.ts && npx tsc --noEmit -p .`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add lib/ai/image-prompts.ts lib/ai/image-prompts.test.ts
git commit -m "feat(storyboard): Bring Nano Banana prompts over from the CLI"
```

---

### Task 4: 分鏡表提示詞與解析

**Files:**
- Create: `lib/ai/storyboard-prompts.ts`
- Test: `lib/ai/storyboard-prompts.test.ts`

**Interfaces:**
- Consumes: `ScriptShot`、`ChatMessage`（Task 1）
- Produces:
  - `interface ScriptContext { ratio: VideoRatio; tone: string; packagingText: string; locale: Locale }`
  - `interface ScriptResult { shots: ScriptShot[]; suggestions: string[]; reply: string }`
  - `buildScriptParsePrompt(ctx & { sourceText: string; hasSourceImage: boolean; productCount: number }): string`
  - `buildScriptRevisePrompt(ctx & { shots: ScriptShot[]; chat: ChatMessage[]; message: string }): string`
  - `buildImagePromptsPrompt(ctx & { shots: ScriptShot[] }): string`
  - `buildImagePromptRewritePrompt(ctx & { shot: ScriptShot; currentPrompt: string; note: string }): string`
  - `parseScriptResult(raw: unknown): ScriptResult`
  - `parseImagePrompts(raw: unknown, ids: string[]): Record<string, string>`
  - `parseRewrittenPrompt(raw: unknown): string`

- [ ] **Step 1: 寫失敗的測試**

`lib/ai/storyboard-prompts.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  buildImagePromptsPrompt,
  buildScriptParsePrompt,
  buildScriptRevisePrompt,
  parseImagePrompts,
  parseRewrittenPrompt,
  parseScriptResult,
} from "./storyboard-prompts";

const ctx = { ratio: "9:16" as const, tone: "高級、乾淨", packagingText: "PDRN 極潤修護黑面膜", locale: "zh" as const };

describe("parseScriptResult", () => {
  it("normalizes ids, seconds and missing fields", () => {
    const result = parseScriptResult({
      reply: "好的",
      suggestions: ["前 2 秒加快", 3],
      shots: [
        { id: "1", seconds: "4秒", visual: "黑色布膜展開", music: "" },
        { seconds: 15, visual: "產品與 Logo", hasPackaging: true },
        { seconds: 0, visual: "  " },
      ],
    });
    expect(result.shots.map((s) => s.id)).toEqual(["s01", "s02"]);
    expect(result.shots[0].seconds).toBe(4);
    expect(result.shots[0].music).toBe("無");
    expect(result.shots[0].camera).toBe("");
    expect(result.shots[1].seconds).toBe(10);
    expect(result.shots[1].hasPackaging).toBe(true);
    expect(result.suggestions).toEqual(["前 2 秒加快"]);
    expect(result.reply).toBe("好的");
  });
  it("defaults unreadable seconds to 4", () => {
    expect(parseScriptResult({ shots: [{ visual: "a", seconds: "幾秒" }] }).shots[0].seconds).toBe(4);
  });
  it("throws when there are no shots", () => {
    expect(() => parseScriptResult({ shots: [] })).toThrow();
    expect(() => parseScriptResult(null)).toThrow();
  });
});

describe("parseImagePrompts", () => {
  it("returns a prompt per id", () => {
    expect(parseImagePrompts({ prompts: { s01: " a ", s02: "b" } }, ["s01", "s02"])).toEqual({ s01: "a", s02: "b" });
  });
  it("throws when a shot is missing", () => {
    expect(() => parseImagePrompts({ prompts: { s01: "a" } }, ["s01", "s02"])).toThrow("s02");
  });
});

describe("parseRewrittenPrompt", () => {
  it("reads the prompt", () => {
    expect(parseRewrittenPrompt({ prompt: " new " })).toBe("new");
    expect(() => parseRewrittenPrompt({})).toThrow();
  });
});

describe("prompt builders", () => {
  it("include the storyboard rules and context", () => {
    const text = buildScriptParsePrompt({ ...ctx, sourceText: "布膜材質動畫", hasSourceImage: true, productCount: 1 });
    expect(text).toContain("布膜材質動畫");
    expect(text).toContain("first image");
    expect(text).toContain("3 to 10 seconds");
    expect(text).toContain("Traditional Chinese");
    expect(text).toContain("PDRN 極潤修護黑面膜");
  });
  it("send the current table and the request when revising", () => {
    const shots = parseScriptResult({ shots: [{ visual: "布膜展開" }] }).shots;
    const text = buildScriptRevisePrompt({ ...ctx, shots, chat: [], message: "s01 改成手拿面膜" });
    expect(text).toContain("布膜展開");
    expect(text).toContain("s01 改成手拿面膜");
  });
  it("asks for English image prompts keyed by shot id", () => {
    const shots = parseScriptResult({ shots: [{ visual: "布膜展開" }] }).shots;
    expect(buildImagePromptsPrompt({ ...ctx, shots })).toContain('"s01"');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/ai/storyboard-prompts.test.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作**

`lib/ai/storyboard-prompts.ts`：

```ts
import type { Locale, VideoRatio } from "@/types";
import type { ChatMessage, ScriptShot } from "@/lib/storyboard/types";

export interface ScriptContext {
  ratio: VideoRatio;
  tone: string;
  packagingText: string;
  locale: Locale;
}

export interface ScriptResult {
  shots: ScriptShot[];
  suggestions: string[];
  /** Short message to the user about what changed */
  reply: string;
}

const MAX_SHOTS = 20;

// Rules from the ai-video storyboard skill
const STORYBOARD_RULES = [
  "- The first 2 seconds need a hook. The product must be clearly visible, and the last shot ends on the product: packaging large, facing the camera, still.",
  "- Each shot is 3 to 10 seconds (video model limit). If the script wants a shorter shot, keep its intended length; it will be generated longer and trimmed in editing.",
  "- Keep lighting, setting and people consistent from shot to shot.",
  "- Write the sound effects for every shot. Music is \"無\" (none) unless the user asks for music in that shot; music is added in editing.",
  "- On-screen text (captions, titles) goes only in onScreenText. It is added in editing and must never be drawn in the picture.",
  "- Keep the user's core message and their on-screen text wording.",
  "- Set hasPackaging to true when the product packaging is visible in the shot.",
].join("\n");

const SHOT_SHAPE =
  '{"id": "s01", "seconds": 4, "visual": "...", "camera": "...", "sound": "...", "music": "無", "onScreenText": "...", "transition": "硬切", "hasPackaging": false}';

function languageName(locale: Locale): string {
  return locale === "zh" ? "Traditional Chinese (Taiwan)" : "English";
}

function contextLines(ctx: ScriptContext): string[] {
  const orientation = ctx.ratio === "9:16" ? "vertical 9:16" : "horizontal 16:9";
  return [
    `- Format: ${orientation} short video for Reels / Shorts, made of separate shots cut together in an editor.`,
    ctx.tone.trim() ? `- Tone: ${ctx.tone.trim()}` : "",
    ctx.packagingText.trim() ? `- Text printed on the packaging (must never change): ${ctx.packagingText.trim()}` : "",
  ].filter(Boolean);
}

function resultInstructions(locale: Locale): string[] {
  const lang = languageName(locale);
  return [
    `Write every field in ${lang}, except keep the user's on-screen text exactly as written.`,
    `"reply": one or two sentences in ${lang} telling the user what you did.`,
    `"suggestions": 2 to 5 short points in ${lang}: what you adjusted and why, or what the user should decide (e.g. who the model is).`,
    "Return JSON only, shaped like:",
    `{"reply": "...", "suggestions": ["..."], "shots": [${SHOT_SHAPE}]}`,
  ];
}

export function buildScriptParsePrompt(
  ctx: ScriptContext & { sourceText: string; hasSourceImage: boolean; productCount: number }
): string {
  const images: string[] = [];
  if (ctx.hasSourceImage) {
    images.push(
      "The first image is the user's script, usually a table where each row is a shot (what the picture shows, and the on-screen text). Read every row."
    );
  }
  if (ctx.productCount) {
    images.push(
      `The ${ctx.hasSourceImage ? "remaining" : ""} ${ctx.productCount > 1 ? "images are" : "image is"} the product.`.replace("  ", " ")
    );
  }
  return [
    "You are a short-video director turning a script into a shot-by-shot storyboard for an AI video model.",
    "",
    "Context:",
    ...contextLines(ctx),
    ...images.map((line) => `- ${line}`),
    "",
    ctx.sourceText.trim() ? `User's script or idea:\n${ctx.sourceText.trim()}` : "",
    "",
    "Turn it into a storyboard table and improve it without changing the core message. Rules:",
    STORYBOARD_RULES,
    "",
    ...resultInstructions(ctx.locale),
  ].join("\n");
}

export function buildScriptRevisePrompt(
  ctx: ScriptContext & { shots: ScriptShot[]; chat: ChatMessage[]; message: string }
): string {
  const history = ctx.chat
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "You"}: ${m.text}`)
    .join("\n");
  return [
    "You are a short-video director editing a storyboard table with the user.",
    "",
    "Context:",
    ...contextLines(ctx),
    "",
    "Current storyboard (the user may have edited cells by hand; treat this as the latest version):",
    JSON.stringify(ctx.shots, null, 2),
    "",
    history ? `Conversation so far:\n${history}\n` : "",
    `User's request: ${ctx.message.trim()}`,
    "",
    "Apply the request and return the whole updated table. Keep shots the user did not mention unchanged, including their ids. New shots get new ids; renumber ids in order (s01, s02, ...) only if shots were inserted or removed.",
    "Rules:",
    STORYBOARD_RULES,
    "",
    ...resultInstructions(ctx.locale),
  ].join("\n");
}

export function buildImagePromptsPrompt(ctx: ScriptContext & { shots: ScriptShot[] }): string {
  return [
    "Write one English image prompt per shot for Nano Banana, to make the storyboard keyframe (the first frame of each shot).",
    "",
    "Context:",
    ...contextLines(ctx),
    "- The product image(s) are attached to every generation, so refer to \"the product\" rather than describing its label.",
    "",
    "Storyboard:",
    JSON.stringify(ctx.shots, null, 2),
    "",
    "Rules:",
    "- 2 to 4 sentences per shot: subject and pose, setting, camera framing and angle, lighting and color mood. A still frame, not motion.",
    "- Keep people, setting and lighting consistent across shots; describe a recurring person the same way every time.",
    "- No on-screen text, captions or logos other than what is printed on the product.",
    "",
    "Return JSON only, shaped like:",
    `{"prompts": {${ctx.shots.map((s) => `"${s.id}": "..."`).join(", ")}}}`,
  ].join("\n");
}

export function buildImagePromptRewritePrompt(
  ctx: ScriptContext & { shot: ScriptShot; currentPrompt: string; note: string }
): string {
  return [
    "Revise an English image prompt for a storyboard keyframe.",
    "",
    "Context:",
    ...contextLines(ctx),
    "",
    `Shot: ${JSON.stringify(ctx.shot)}`,
    `Current prompt: ${ctx.currentPrompt}`,
    `User's change (may be in any language): ${ctx.note.trim()}`,
    "",
    "Apply the change, keep everything else, 2 to 4 sentences, English, no on-screen text.",
    'Return JSON only: {"prompt": "..."}',
  ].join("\n");
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function seconds(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(str(value));
  if (!Number.isFinite(n) || n <= 0) return 4;
  return Math.min(10, Math.max(1, Math.round(n * 2) / 2));
}

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function parseScriptResult(raw: unknown): ScriptResult {
  const data = record(raw);
  const rows = Array.isArray(data.shots) ? data.shots : [];
  const shots = rows
    .map(record)
    .filter((row) => str(row.visual))
    .slice(0, MAX_SHOTS)
    .map((row, index): ScriptShot => ({
      id: `s${String(index + 1).padStart(2, "0")}`,
      seconds: seconds(row.seconds),
      visual: str(row.visual),
      camera: str(row.camera),
      sound: str(row.sound),
      music: str(row.music) || "無",
      onScreenText: str(row.onScreenText),
      transition: str(row.transition),
      hasPackaging: row.hasPackaging === true,
    }));
  if (shots.length === 0) {
    throw new Error("Failed to parse AI response: no shots");
  }
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim())
    : [];
  return { shots, suggestions, reply: str(data.reply) };
}

export function parseImagePrompts(raw: unknown, ids: string[]): Record<string, string> {
  const prompts = record(record(raw).prompts);
  const result: Record<string, string> = {};
  for (const id of ids) {
    const prompt = str(prompts[id]);
    if (!prompt) throw new Error(`Failed to parse AI response: missing prompt for ${id}`);
    result[id] = prompt;
  }
  return result;
}

export function parseRewrittenPrompt(raw: unknown): string {
  const prompt = str(record(raw).prompt);
  if (!prompt) throw new Error("Failed to parse AI response: missing prompt");
  return prompt;
}
```

注意：`parseScriptResult` 一律依順序重新編號（`s01`…），AI 給的 id 不採用。這樣「刪掉中間一鏡」時後面的鏡號會往前移，`mergeScriptShots` 會把它們當成內容改變的鏡頭（標記過期），這是預期行為。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test lib/ai/storyboard-prompts.test.ts && npx tsc --noEmit -p .`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/ai/storyboard-prompts.ts lib/ai/storyboard-prompts.test.ts
git commit -m "feat(storyboard): Add storyboard prompts and response parsing"
```

---

### Task 5: Gemini 文字呼叫（分鏡表）與 service

**Files:**
- Modify: `lib/ai/gemini-client.ts`
- Create: `app/actions/server/storyboard.ts`
- Modify: `services/videoClient.ts`
- Create: `services/storyboardService.ts`

**Interfaces:**
- Consumes: Task 4 的 builders 與 parsers
- Produces（`services/storyboardService.ts`，全部需要 `apiKey: string`）：
  - `parseScript(input: ScriptParseInput, files: { source?: File; products: File[] }, apiKey): Promise<ScriptResult>`
  - `reviseScript(input: ScriptReviseInput, apiKey): Promise<ScriptResult>`
  - `writeImagePrompts(input: ImagePromptsInput, apiKey): Promise<Record<string, string>>`
  - `rewriteImagePrompt(input: ImagePromptRewriteInput, apiKey): Promise<string>`
  - 型別（在 `lib/ai/storyboard-prompts.ts` 末尾 export）：
    `ScriptParseInput = ScriptContext & { sourceText: string }`、
    `ScriptReviseInput = ScriptContext & { shots: ScriptShot[]; chat: ChatMessage[]; message: string }`、
    `ImagePromptsInput = ScriptContext & { shots: ScriptShot[] }`、
    `ImagePromptRewriteInput = ScriptContext & { shot: ScriptShot; currentPrompt: string; note: string }`

這一層只是轉呼叫，解析邏輯已在 Task 4 測過；本 task 以型別檢查與 Task 15 的實際執行驗證。

- [ ] **Step 1: 在 `lib/ai/storyboard-prompts.ts` 末尾加輸入型別**

```ts
export type ScriptParseInput = ScriptContext & { sourceText: string };
export type ScriptReviseInput = ScriptContext & { shots: ScriptShot[]; chat: ChatMessage[]; message: string };
export type ImagePromptsInput = ScriptContext & { shots: ScriptShot[] };
export type ImagePromptRewriteInput = ScriptContext & { shot: ScriptShot; currentPrompt: string; note: string };
```

- [ ] **Step 2: `GeminiClient` 加方法**

在 `lib/ai/gemini-client.ts` 的 import 加：

```ts
import {
  buildImagePromptRewritePrompt,
  buildImagePromptsPrompt,
  buildScriptParsePrompt,
  buildScriptRevisePrompt,
  parseImagePrompts,
  parseRewrittenPrompt,
  parseScriptResult,
  type ImagePromptRewriteInput,
  type ImagePromptsInput,
  type ScriptParseInput,
  type ScriptResult,
  type ScriptReviseInput,
} from "./storyboard-prompts";
```

在 `composePrompt` 後面加：

```ts
  /**
   * Generate JSON and validate it; a malformed answer is retried once
   */
  private async generateParsed<T>(
    prompt: string,
    imageParts: Part[],
    validate: (raw: unknown) => T,
    thinkingLevel?: GeminiThinkingLevel
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await this.generateJson(prompt, imageParts, thinkingLevel ?? this.thinkingLevel);
      try {
        return validate(this.parse<unknown>(text));
      } catch (err) {
        lastError = err;
        logger.warn(`Invalid AI response (attempt ${attempt + 1}):`, err);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Failed to parse AI response");
  }

  /**
   * Storyboard: turn a script image and/or text into a shot table with suggestions
   */
  async parseScript(input: ScriptParseInput, source: File | undefined, products: File[]): Promise<ScriptResult> {
    const files = source ? [source, ...products] : products;
    const imageParts = await Promise.all(files.map((file) => this.fileToGenerativePart(file)));
    const prompt = buildScriptParsePrompt({
      ...input,
      hasSourceImage: !!source,
      productCount: products.length,
    });
    return this.generateParsed(prompt, imageParts, parseScriptResult);
  }

  /**
   * Storyboard: apply a chat request to the table
   */
  async reviseScript(input: ScriptReviseInput): Promise<ScriptResult> {
    return this.generateParsed(buildScriptRevisePrompt(input), [], parseScriptResult);
  }

  /**
   * Storyboard: write an English keyframe prompt for every shot
   */
  async writeImagePrompts(input: ImagePromptsInput): Promise<Record<string, string>> {
    const ids = input.shots.map((shot) => shot.id);
    return this.generateParsed(buildImagePromptsPrompt(input), [], (raw) => parseImagePrompts(raw, ids));
  }

  /**
   * Storyboard: rewrite one keyframe prompt from a short note (fast, low thinking)
   */
  async rewriteImagePrompt(input: ImagePromptRewriteInput): Promise<string> {
    return this.generateParsed(buildImagePromptRewritePrompt(input), [], parseRewrittenPrompt, "low");
  }
```

- [ ] **Step 3: Server actions**

`app/actions/server/storyboard.ts`：

```ts
"use server";

import { toActionResult, type ActionResult } from "@/lib/action-result";
import { GeminiClient, parseThinkingLevel } from "@/lib/ai/gemini-client";
import type {
  ImagePromptRewriteInput,
  ImagePromptsInput,
  ScriptParseInput,
  ScriptResult,
  ScriptReviseInput,
} from "@/lib/ai/storyboard-prompts";

// Storyboard mode always runs on the user's own key
function createClient(apiKey: string): GeminiClient {
  if (!apiKey) {
    throw new Error("errors.apiKeyRequired");
  }
  return new GeminiClient({ apiKey, thinkingLevel: parseThinkingLevel(process.env.GEMINI_THINKING_LEVEL) });
}

export async function parseScriptAction(
  input: ScriptParseInput,
  source: File | undefined,
  products: File[],
  apiKey: string
): Promise<ActionResult<ScriptResult>> {
  return toActionResult(() => createClient(apiKey).parseScript(input, source, products));
}

export async function reviseScriptAction(input: ScriptReviseInput, apiKey: string): Promise<ActionResult<ScriptResult>> {
  return toActionResult(() => createClient(apiKey).reviseScript(input));
}

export async function writeImagePromptsAction(
  input: ImagePromptsInput,
  apiKey: string
): Promise<ActionResult<Record<string, string>>> {
  return toActionResult(() => createClient(apiKey).writeImagePrompts(input));
}

export async function rewriteImagePromptAction(
  input: ImagePromptRewriteInput,
  apiKey: string
): Promise<ActionResult<string>> {
  return toActionResult(() => createClient(apiKey).rewriteImagePrompt(input));
}
```

- [ ] **Step 4: Service（static / server 雙路徑）**

`services/storyboardService.ts`：

```ts
import { unwrapActionResult } from "@/lib/action-result";
import { createGeminiClient } from "@/lib/ai/gemini-client";
import type {
  ImagePromptRewriteInput,
  ImagePromptsInput,
  ScriptParseInput,
  ScriptResult,
  ScriptReviseInput,
} from "@/lib/ai/storyboard-prompts";

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

export async function parseScript(
  input: ScriptParseInput,
  files: { source?: File; products: File[] },
  apiKey: string
): Promise<ScriptResult> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).parseScript(input, files.source, files.products);
  }
  const { parseScriptAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await parseScriptAction(input, files.source, files.products, apiKey));
}

export async function reviseScript(input: ScriptReviseInput, apiKey: string): Promise<ScriptResult> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).reviseScript(input);
  }
  const { reviseScriptAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await reviseScriptAction(input, apiKey));
}

export async function writeImagePrompts(input: ImagePromptsInput, apiKey: string): Promise<Record<string, string>> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).writeImagePrompts(input);
  }
  const { writeImagePromptsAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await writeImagePromptsAction(input, apiKey));
}

export async function rewriteImagePrompt(input: ImagePromptRewriteInput, apiKey: string): Promise<string> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).rewriteImagePrompt(input);
  }
  const { rewriteImagePromptAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await rewriteImagePromptAction(input, apiKey));
}
```

`services/videoClient.ts` 不需要改（static 路徑直接在 service 裡建立 client）。

- [ ] **Step 5: 檢查**

Run: `npx tsc --noEmit -p . && pnpm test && npx eslint lib/ai services app/actions`
Expected: 無錯誤（`ModeImageUploader` 既有的 `<img>` warning 可忽略）。

- [ ] **Step 6: Commit**

```bash
git add lib/ai app/actions/server/storyboard.ts services/storyboardService.ts
git commit -m "feat(storyboard): Add Gemini calls for the storyboard table"
```

---

### Task 6: 瀏覽器生圖服務

**Files:**
- Create: `lib/storyboard/blob.ts`
- Test: `lib/storyboard/blob.test.ts`
- Create: `services/imageService.ts`

**Interfaces:**
- Consumes: `IMAGE_MODEL`（Task 3）、`StoredImage`、`ImageSize`
- Produces:
  - `blobToBase64(blob: Blob): Promise<string>`、`base64ToBlob(data: string, mimeType: string): Blob`、`toFile(image: StoredImage, name: string): File`
  - `pickImage(response: ImageResponseLike): { data: string; mimeType: string } | { error: string }`
  - `generateImage(options: { apiKey: string; instruction: string; images: StoredImage[]; ratio: VideoRatio; size: ImageSize }): Promise<StoredImage>`

- [ ] **Step 1: 寫失敗的測試**

`lib/storyboard/blob.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { base64ToBlob, blobToBase64, pickImage } from "./blob";

describe("blob helpers", () => {
  it("round-trips bytes through base64", async () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
    const base64 = await blobToBase64(new Blob([bytes]));
    const back = new Uint8Array(await base64ToBlob(base64, "image/png").arrayBuffer());
    expect(back).toEqual(bytes);
  });
});

describe("pickImage", () => {
  it("takes the last non-thought image", () => {
    const result = pickImage({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: "draft", mimeType: "image/png" }, thought: true },
              { text: "here" },
              { inlineData: { data: "first", mimeType: "image/png" } },
              { inlineData: { data: "final", mimeType: "image/jpeg" } },
            ],
          },
        },
      ],
    });
    expect(result).toEqual({ data: "final", mimeType: "image/jpeg" });
  });
  it("reports why there is no image", () => {
    expect(pickImage({ promptFeedback: { blockReason: "SAFETY" } })).toEqual({ error: "SAFETY" });
    expect(pickImage({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] })).toEqual({
      error: "IMAGE_SAFETY",
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/storyboard/blob.test.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作 `lib/storyboard/blob.ts`**

```ts
import type { StoredImage } from "./types";

// Chunked so large images do not overflow String.fromCharCode's argument limit
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(data: string, mimeType: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function toFile(image: StoredImage, name: string): File {
  const ext = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType.split("/")[1] || "png";
  return new File([image.blob], `${name}.${ext}`, { type: image.mimeType });
}

export interface ImageResponseLike {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean; inlineData?: { data?: string; mimeType?: string } }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

/** Skip interim "thought" images; the last real image is the result */
export function pickImage(response: ImageResponseLike): { data: string; mimeType: string } | { error: string } {
  const parts = (response.candidates?.[0]?.content?.parts ?? []).filter((part) => !part.thought);
  const found = [...parts].reverse().find((part) => part.inlineData?.data);
  if (found?.inlineData?.data) {
    return { data: found.inlineData.data, mimeType: found.inlineData.mimeType ?? "image/png" };
  }
  return {
    error: response.promptFeedback?.blockReason ?? response.candidates?.[0]?.finishReason ?? "NO_IMAGE",
  };
}
```

- [ ] **Step 4: 實作 `services/imageService.ts`**

```ts
import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL } from "@/lib/ai/image-prompts";
import { base64ToBlob, blobToBase64, pickImage, type ImageResponseLike } from "@/lib/storyboard/blob";
import type { StoredImage } from "@/lib/storyboard/types";
import type { ImageSize, VideoRatio } from "@/types";

/**
 * Nano Banana, called from the browser with the user's key:
 * 2K / 4K images are several MB of base64, so a server round trip only slows things down.
 */
export async function generateImage(options: {
  apiKey: string;
  instruction: string;
  /** Reference images, sent before the instruction */
  images: StoredImage[];
  ratio: VideoRatio;
  size: ImageSize;
}): Promise<StoredImage> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const imageParts = await Promise.all(
    options.images.map(async (image) => ({
      inlineData: { mimeType: image.mimeType, data: await blobToBase64(image.blob) },
    }))
  );
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [...imageParts, { text: options.instruction }] }],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: { aspectRatio: options.ratio, imageSize: options.size },
    },
  });
  const result = pickImage(response as ImageResponseLike);
  if ("error" in result) {
    // Safety blocks map to the same i18n keys as video
    const isSafety = /SAFETY|BLOCK|PROHIBITED/i.test(result.error);
    throw new Error(isSafety ? "errors.contentFiltered" : `errors.imageGenerationFailed`);
  }
  return { blob: base64ToBlob(result.data, result.mimeType), mimeType: result.mimeType };
}
```

- [ ] **Step 5: 跑測試與型別檢查**

Run: `pnpm test && npx tsc --noEmit -p .`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add lib/storyboard/blob.ts lib/storyboard/blob.test.ts services/imageService.ts
git commit -m "feat(storyboard): Generate Nano Banana images in the browser"
```

---

### Task 7: 併發佇列與 429 重試

**Files:**
- Create: `lib/storyboard/queue.ts`
- Test: `lib/storyboard/queue.test.ts`

**Interfaces:**
- Produces:
  - `type TaskResult<T> = { ok: true; value: T } | { ok: false; error: unknown }`
  - `interface QueueOptions { concurrency: number; retries?: number; retryDelayMs?: number; sleep?: (ms: number) => Promise<void> }`
  - `runQueue<T>(tasks: (() => Promise<T>)[], options: QueueOptions): Promise<TaskResult<T>[]>`
  - `isRateLimitError(err: unknown): boolean`
  - 常數 `IMAGE_CONCURRENCY = 4`、`VIDEO_CONCURRENCY = 3`、`DRAFT_CONCURRENCY = 4`

- [ ] **Step 1: 寫失敗的測試**

`lib/storyboard/queue.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { isRateLimitError, runQueue } from "./queue";

const noSleep = () => Promise.resolve();

describe("runQueue", () => {
  it("never runs more tasks than the concurrency limit", async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return i;
    });
    const results = await runQueue(tasks, { concurrency: 3 });
    expect(peak).toBe(3);
    expect(results.map((r) => (r.ok ? r.value : -1))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps going when a task fails", async () => {
    const results = await runQueue(
      [async () => 1, async () => { throw new Error("boom"); }, async () => 3],
      { concurrency: 2, sleep: noSleep }
    );
    expect(results[0]).toEqual({ ok: true, value: 1 });
    expect(results[1].ok).toBe(false);
    expect(results[2]).toEqual({ ok: true, value: 3 });
  });

  it("retries rate-limited tasks up to the limit", async () => {
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error("Too many requests"), { status: 429 });
      return "ok";
    };
    expect(await runQueue([flaky], { concurrency: 1, retries: 2, sleep: noSleep })).toEqual([{ ok: true, value: "ok" }]);

    let always = 0;
    const results = await runQueue(
      [async () => { always++; throw new Error("RESOURCE_EXHAUSTED"); }],
      { concurrency: 1, retries: 2, sleep: noSleep }
    );
    expect(results[0].ok).toBe(false);
    expect(always).toBe(3);
  });

  it("does not retry other errors", async () => {
    let calls = 0;
    await runQueue([async () => { calls++; throw new Error("bad request"); }], { concurrency: 1, retries: 2, sleep: noSleep });
    expect(calls).toBe(1);
  });
});

describe("isRateLimitError", () => {
  it("detects 429s", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error("got status 429"))).toBe(true);
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
    expect(isRateLimitError(new Error("errors.rateLimited"))).toBe(true);
    expect(isRateLimitError(new Error("invalid argument"))).toBe(false);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/storyboard/queue.test.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作**

`lib/storyboard/queue.ts`：

```ts
export const IMAGE_CONCURRENCY = 4;
export const VIDEO_CONCURRENCY = 3;
export const DRAFT_CONCURRENCY = 4;

export type TaskResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export interface QueueOptions {
  concurrency: number;
  /** Extra attempts for rate-limited tasks */
  retries?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export function isRateLimitError(err: unknown): boolean {
  const status = (err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code;
  if (status === 429) return true;
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /429|rate.?limit|RESOURCE_EXHAUSTED|too many requests|errors\.rateLimited/i.test(message);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run tasks with a concurrency limit. A failing task never stops the others;
 * rate-limited tasks are retried with a growing delay.
 */
export async function runQueue<T>(tasks: (() => Promise<T>)[], options: QueueOptions): Promise<TaskResult<T>[]> {
  const { concurrency, retries = 2, retryDelayMs = 5000, sleep = defaultSleep } = options;
  const results: TaskResult<T>[] = new Array(tasks.length);
  let next = 0;

  const runOne = async (task: () => Promise<T>): Promise<TaskResult<T>> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return { ok: true, value: await task() };
      } catch (error) {
        if (attempt >= retries || !isRateLimitError(error)) return { ok: false, error };
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  };

  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await runOne(tasks[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test lib/storyboard/queue.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/storyboard/queue.ts lib/storyboard/queue.test.ts
git commit -m "feat(storyboard): Add a concurrency-limited job queue with 429 retry"
```

---

### Task 8: 抽出共用的影片生成流程

**Files:**
- Create: `lib/video/errors.ts`
- Test: `lib/video/errors.test.ts`
- Create: `lib/video/crop.ts`
- Create: `lib/video/job.ts`
- Modify: `hooks/useVideoGeneration.ts`

**Interfaces:**
- Produces:
  - `toDisplayError(message: string): string`（從 hook 搬出）
  - `cropImageToRatio(image: Blob, ratio: VideoRatio): Promise<string>`（從 hook 搬出，參數由 `File` 放寬為 `Blob`）
  - `interface VideoJobHooks { apiKey?: string; isCancelled: () => boolean; onProgress: (progress: number) => void; onJobId?: (jobId: string) => void }`
  - `interface VideoJobResult { videoUrl: string; sourceVideoUri?: string }`
  - `interface VideoJobInput { prompt: string; ratio: VideoRatio; resolution: VideoResolution; duration: VideoDuration; audioMode: AudioMode; negativePrompt?: string; startImage?: Blob; endImage?: Blob; referenceImages?: Blob[] }`
  - `runVideoJob(input: VideoJobInput, hooks: VideoJobHooks): Promise<VideoJobResult | null>`（取消時回傳 `null`）
  - `runExtendJob(params: VideoExtensionParams, hooks: VideoJobHooks): Promise<VideoJobResult | null>`

- [ ] **Step 1: 寫失敗的測試**

`lib/video/errors.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { toDisplayError } from "./errors";

describe("toDisplayError", () => {
  it("keeps i18n keys", () => {
    expect(toDisplayError("errors.contentFiltered")).toBe("errors.contentFiltered");
  });
  it("maps known API messages", () => {
    expect(toDisplayError("You exceeded your current quota")).toBe("errors.quotaExceeded");
    expect(toDisplayError("Rate limit reached")).toBe("errors.rateLimited");
    expect(toDisplayError("API key not valid")).toBe("errors.apiKeyInvalid");
    expect(toDisplayError("fetch failed")).toBe("errors.networkError");
  });
  it("shows unknown messages as-is and falls back when empty", () => {
    expect(toDisplayError("Something odd")).toBe("Something odd");
    expect(toDisplayError("")).toBe("errors.videoGenerationFailed");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/video/errors.test.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 搬出 `toDisplayError` 與 `cropImageToRatio`**

把 `hooks/useVideoGeneration.ts` 裡的 `toDisplayError` 與 `matchErrorKey`（含註解）原封不動剪下，貼到 `lib/video/errors.ts`，並把 `toDisplayError` 改成 `export function`。

把 `cropImageToRatio`（含註解）剪下貼到 `lib/video/crop.ts`，檔頭加 `import type { VideoRatio } from "@/types";`，改成 `export async function cropImageToRatio(file: Blob, targetRatio: VideoRatio): Promise<string>`，內容不變（`URL.createObjectURL` 本來就接受 Blob）。

- [ ] **Step 4: 建立 `lib/video/job.ts`**

```ts
import { checkVideoStatus, extendVideo, startVideoGeneration } from "@/services/videoService";
import type { VideoExtensionParams, VideoGenerationParams } from "@/services/video-providers/types";
import type { AudioMode, VideoDuration, VideoRatio, VideoResolution } from "@/types";
import { cropImageToRatio } from "./crop";

const POLL_INTERVAL = 3000;
const MAX_POLLS = 200; // ~10 minutes max

export interface VideoJobHooks {
  apiKey?: string;
  /** Checked between polls; a cancelled job resolves to null */
  isCancelled: () => boolean;
  onProgress: (progress: number) => void;
  onJobId?: (jobId: string) => void;
}

export interface VideoJobResult {
  videoUrl: string;
  sourceVideoUri?: string;
}

export interface VideoJobInput {
  prompt: string;
  ratio: VideoRatio;
  resolution: VideoResolution;
  duration: VideoDuration;
  audioMode: AudioMode;
  negativePrompt?: string;
  startImage?: Blob;
  endImage?: Blob;
  referenceImages?: Blob[];
}

async function pollUntilDone(jobId: string, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  for (let i = 0; i < MAX_POLLS; i++) {
    if (hooks.isCancelled()) return null;

    let result: Awaited<ReturnType<typeof checkVideoStatus>>;
    try {
      result = await checkVideoStatus(jobId, hooks.apiKey);
    } catch (err) {
      // Request itself failed (network etc.) - transient, keep polling
      if (process.env.NODE_ENV === "development") {
        console.error("[Poll] Transient error, continuing:", err);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      continue;
    }

    if (result.status === "completed" && result.videoUrl) {
      return { videoUrl: result.videoUrl, sourceVideoUri: result.sourceVideoUri };
    }
    if (result.status === "failed") {
      throw new Error(result.error || "errors.videoGenerationFailed");
    }
    if (!hooks.isCancelled()) hooks.onProgress(result.progress ?? 0);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  throw new Error("Video generation timed out");
}

/**
 * Start one Omni generation and poll it to the end
 */
export async function runVideoJob(input: VideoJobInput, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  const crop = (image: Blob) => cropImageToRatio(image, input.ratio);
  const params: VideoGenerationParams = {
    prompt: input.prompt,
    negativePrompt: input.negativePrompt || undefined,
    duration: input.duration,
    ratio: input.ratio,
    resolution: input.resolution,
    audioMode: input.audioMode,
  };
  if (input.startImage) {
    params.firstFrameImage = await crop(input.startImage);
    if (input.endImage) params.lastFrameImage = await crop(input.endImage);
  } else if (input.referenceImages?.length) {
    params.referenceImages = await Promise.all(input.referenceImages.map(crop));
  }
  if (hooks.isCancelled()) return null;

  const job = await startVideoGeneration(params, hooks.apiKey);
  hooks.onJobId?.(job.jobId);
  return pollUntilDone(job.jobId, hooks);
}

/**
 * Extend a finished video and poll the extension to the end
 */
export async function runExtendJob(params: VideoExtensionParams, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  const job = await extendVideo(params, hooks.apiKey);
  hooks.onJobId?.(job.jobId);
  return pollUntilDone(job.jobId, hooks);
}
```

- [ ] **Step 5: 改寫 `hooks/useVideoGeneration.ts` 使用共用流程**

import 區改為：

```ts
import { useState, useRef, useCallback } from "react";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { composePrompt, cleanupVideoJob } from "@/services/videoService";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import type { PromptContext } from "@/lib/ai/prompts";
import type {
  AudioMode,
  PromptFields,
  UploadedImage,
  VideoDuration,
  VideoGenerationMode,
  VideoRatio,
  VideoResolution,
} from "@/types";
```

刪除 `POLL_INTERVAL`、`MAX_POLLS` 常數與 `pollUntilDone`（保留 `MAX_TOTAL_DURATION`）。新增：

```ts
  // Hooks for the shared job runner, bound to this run
  const jobHooks = useCallback((runId: number, key: string | undefined) => ({
    apiKey: key,
    isCancelled: () => runIdRef.current !== runId,
    onProgress: (value: number) => {
      if (runIdRef.current === runId) setProgress(value);
    },
    onJobId: (jobId: string) => {
      jobIdsRef.current.push(jobId);
    },
  }), []);
```

`generate` 的 `try` 區塊中，從 `const images = await Promise.all(...)` 到 `if (!done) return false;` 換成：

```ts
      const files = request.images.map((img) => img.file);
      const done = await runVideoJob(
        {
          prompt,
          ratio: request.ratio,
          resolution: request.resolution,
          duration: request.duration,
          audioMode: request.audioMode,
          negativePrompt: request.negativePrompt,
          // Same mapping as before: end frame → transition, 1 image → first frame, 2-3 → references
          startImage: request.mode === "frames_to_video" || files.length === 1 ? files[0] : undefined,
          endImage: request.mode === "frames_to_video" ? files[1] : undefined,
          referenceImages: request.mode !== "frames_to_video" && files.length > 1 ? files : undefined,
        },
        jobHooks(runId, key)
      );
      if (!done) return false;
      const job = { jobId: jobIdsRef.current[jobIdsRef.current.length - 1] };
```

（後面 `shownJobIdRef.current = job.jobId;` 等程式不變。）`useCallback` 依賴改為 `[jobHooks, releaseJobs]`。

`extend` 的 `try` 區塊中，`const job = await extendVideo(...)` 到 `if (!done) return false;` 換成：

```ts
      const done = await runExtendJob(
        {
          prompt,
          sourceVideoUri: last.sourceVideoUri,
          ratio: last.ratio,
          resolution: last.resolution,
          audioMode: last.audioMode,
          extensionDuration: seconds,
        },
        jobHooks(runId, last.apiKey)
      );
      if (!done) return false;
      const job = { jobId: jobIdsRef.current[jobIdsRef.current.length - 1] };
```

`useCallback` 依賴改為 `[jobHooks]`。

- [ ] **Step 6: 測試、型別、lint**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint hooks lib`
Expected: 全部通過。

- [ ] **Step 7: 手動確認單鏡模式沒壞**

```bash
VIDEO_PROVIDER=mock pnpm dev -p 8001
```

在 http://localhost:8001 輸入描述「測試」、按「直接生成」，Expected：進度條跑完、出現影片（mock 的 Big Buck Bunny），沒有 console 錯誤。測完停掉 server。

- [ ] **Step 8: Commit**

```bash
git add lib/video hooks/useVideoGeneration.ts
git commit -m "refactor(video): Extract the generation job runner for reuse"
```

---

### Task 9: IndexedDB 儲存與專案 hook

**Files:**
- Create: `lib/storyboard/storage.ts`
- Create: `hooks/useStoryboardProject.ts`

**Interfaces:**
- Consumes: `StoryboardProject`、`ProjectSummary`、`normalizeOnLoad`、`newProject`
- Produces:
  - `listProjects(): Promise<ProjectSummary[]>`（依 `updatedAt` 新到舊）、`loadProject(id)`、`saveProject(project)`、`deleteProject(id)`
  - `useStoryboardProject()` 回傳 `{ projects: ProjectSummary[]; project: StoryboardProject | null; isLoading: boolean; open(id: string): void; create(): void; remove(id: string): Promise<void>; update(projectId: string, fn: (p: StoryboardProject) => StoryboardProject): void }`
  - `type ProjectUpdater = (fn: (p: StoryboardProject) => StoryboardProject) => void`（已綁定某個專案 id 的 `update`）

IndexedDB 需要瀏覽器，沒有單元測試；以 Task 15 的實際操作驗證（重新整理後資料還在、切換專案時背景工作寫回正確的專案）。

- [ ] **Step 1: `lib/storyboard/storage.ts`**

```ts
import type { ProjectSummary, StoryboardProject } from "./types";

const DB_NAME = "jola-storyboard";
const STORE = "projects";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const all = await run<StoryboardProject[]>("readonly", (store) => store.getAll());
  return all
    .map(({ id, name, updatedAt, step }) => ({ id, name, updatedAt, step }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadProject(id: string): Promise<StoryboardProject | undefined> {
  return run<StoryboardProject | undefined>("readonly", (store) => store.get(id));
}

export async function saveProject(project: StoryboardProject): Promise<void> {
  await run("readwrite", (store) => store.put(project));
}

export async function deleteProject(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}
```

- [ ] **Step 2: `hooks/useStoryboardProject.ts`**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { newProject, normalizeOnLoad } from "@/lib/storyboard/shots";
import { deleteProject, listProjects, loadProject, saveProject } from "@/lib/storyboard/storage";
import type { ProjectSummary, StoryboardProject } from "@/lib/storyboard/types";

const LAST_PROJECT_KEY = "storyboard:lastProject";
const SAVE_DELAY = 500;

export type ProjectUpdater = (fn: (project: StoryboardProject) => StoryboardProject) => void;

export function useStoryboardProject() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<StoryboardProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const projectRef = useRef<StoryboardProject | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Writes to projects that are not open are applied in order, straight to IndexedDB
  const backgroundChain = useRef<Promise<void>>(Promise.resolve());

  const refreshList = useCallback(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (projectRef.current) saveProject(projectRef.current).then(refreshList).catch(() => {});
  }, [refreshList]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  }, [flush]);

  const show = useCallback((next: StoryboardProject | null) => {
    projectRef.current = next;
    setProject(next);
  }, []);

  const open = useCallback(
    (id: string) => {
      flush();
      setIsLoading(true);
      loadProject(id)
        .then((loaded) => {
          show(loaded ? normalizeOnLoad(loaded) : null);
          if (loaded) localStorage.setItem(LAST_PROJECT_KEY, id);
        })
        .finally(() => setIsLoading(false));
    },
    [flush, show]
  );

  const create = useCallback(() => {
    flush();
    const created = newProject(crypto.randomUUID(), Date.now());
    show(created);
    localStorage.setItem(LAST_PROJECT_KEY, created.id);
    saveProject(created).then(refreshList).catch(() => {});
  }, [flush, refreshList, show]);

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id);
      if (projectRef.current?.id === id) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        show(null);
        localStorage.removeItem(LAST_PROJECT_KEY);
      }
      refreshList();
    },
    [refreshList, show]
  );

  const update = useCallback(
    (projectId: string, fn: (p: StoryboardProject) => StoryboardProject) => {
      const current = projectRef.current;
      if (current?.id === projectId) {
        show({ ...fn(current), updatedAt: Date.now() });
        scheduleSave();
        return;
      }
      // A background job finished after the user switched projects
      backgroundChain.current = backgroundChain.current.then(async () => {
        const stored = await loadProject(projectId);
        if (stored) await saveProject({ ...fn(stored), updatedAt: Date.now() });
      }).catch(() => {});
    },
    [scheduleSave, show]
  );

  useEffect(() => {
    refreshList();
    const last = localStorage.getItem(LAST_PROJECT_KEY);
    if (last) open(last);
    else setIsLoading(false);

    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { projects, project, isLoading, open, create, remove, update };
}
```

- [ ] **Step 3: 型別與 lint**

Run: `npx tsc --noEmit -p . && npx eslint hooks lib/storyboard`
Expected: 通過。若 lint 對 `react-hooks/set-state-in-effect` 之類的新規則報錯，照規則訊息調整（例如把 `setIsLoading(false)` 改為初始值由 `localStorage` 判斷），不要整檔停用規則。

- [ ] **Step 4: Commit**

```bash
git add lib/storyboard/storage.ts hooks/useStoryboardProject.ts
git commit -m "feat(storyboard): Store projects in IndexedDB"
```

---

### Task 10: 頁面骨架、頁首切換與語系

**Files:**
- Modify: `locales/zh.json`、`locales/en.json`
- Modify: `components/layout/Header.tsx`
- Modify: `app/page.tsx`（Header 加 `active="single"`）
- Create: `components/storyboard/types.ts`
- Create: `components/storyboard/BlobImage.tsx`
- Create: `components/storyboard/ProjectList.tsx`
- Create: `components/storyboard/StepBar.tsx`
- Create: `app/storyboard/page.tsx`

**Interfaces:**
- Consumes: `useStoryboardProject`、`useApiKeyStatus`、`canEnterStep`
- Produces:
  - `interface StepProps { project: StoryboardProject; update: ProjectUpdater; requireApiKey: () => string | null; goTo: (step: Step) => void }`
  - `<BlobImage blob alt className? onClick? />`
  - Header prop `active?: "single" | "storyboard"`
  - 步驟元件的匯入名稱（Task 11–14 建立）：`ProjectSetupStep`、`ScriptStep`、`ShotImagesStep`、`ShotVideosStep`，皆為 `(props: StepProps) => JSX.Element`

- [ ] **Step 1: 語系**

`locales/zh.json` 的 `header` 物件加：

```json
"modeSingle": "單鏡生成",
"modeStoryboard": "分鏡模式"
```

`errors` 物件加：

```json
"imageGenerationFailed": "分鏡圖生成失敗，請重試"
```

最外層加 `storyboard` 物件：

```json
"storyboard": {
  "projects": "專案",
  "newProject": "新專案",
  "deleteProject": "刪除",
  "deleteConfirm": "刪除「{{name}}」？圖片和影片都會一起刪除，無法復原。",
  "empty": "還沒有專案，按「新專案」開始",
  "loading": "載入中…",
  "steps": { "1": "專案設定", "2": "分鏡表", "3": "分鏡圖", "4": "影片" },
  "next": "下一步",
  "back": "上一步",
  "cost": "預估 {{price}}",
  "costMinimum": "預估 {{price}} 起",
  "setup": {
    "name": "專案名稱",
    "products": "產品圖",
    "productsHint": "1～2 張，每張分鏡圖都會帶上，請用清楚的正面包裝照",
    "packagingText": "包裝上不能錯的字",
    "packagingTextPlaceholder": "例如：PDRN 極潤修護黑面膜",
    "ratio": "比例",
    "ratioLocked": "分鏡表確認後比例就固定了",
    "tone": "調性",
    "tonePlaceholder": "例如：高級、乾淨、科技感"
  },
  "script": {
    "sourceImage": "腳本圖",
    "sourceImageHint": "選填，表格或分鏡截圖",
    "sourceText": "腳本或想法",
    "sourceTextPlaceholder": "貼上腳本，或描述你想做的影片：秒數、要強調的特色、風格…",
    "analyze": "整理成分鏡表",
    "reanalyze": "重新整理",
    "analyzing": "AI 整理中…",
    "suggestions": "AI 建議",
    "table": "分鏡表",
    "columns": {
      "id": "鏡",
      "seconds": "秒",
      "visual": "畫面",
      "camera": "運鏡",
      "sound": "音效",
      "music": "配樂",
      "onScreenText": "畫面文字",
      "transition": "轉場",
      "hasPackaging": "包裝"
    },
    "chatPlaceholder": "想改什麼？例如：s03 改成手拿面膜展示",
    "send": "送出",
    "confirm": "確認分鏡表，生成分鏡圖",
    "confirming": "撰寫生圖提示詞中…",
    "needInput": "請上傳腳本圖或輸入文字"
  },
  "images": {
    "generating": "生成中…",
    "generateMissing": "生成缺少的分鏡圖",
    "stale": "分鏡已修改，建議重生",
    "packagingHint": "請放大檢查包裝上的字",
    "regenerate": "重生 2 張",
    "notePlaceholder": "想怎麼改？例如：人物換成短髮",
    "editPrompt": "編輯英文提示詞",
    "selected": "已選",
    "finalSize": "定稿尺寸",
    "finalSizeHint": "1K 直接使用選好的圖；2K／4K 會用同一個提示詞重出一張",
    "finalize": "重出 {{count}} 張 {{size}}",
    "finalizing": "重出中…",
    "needSelection": "每一鏡都要選好圖",
    "final": "定稿"
  },
  "videos": {
    "settings": "整支影片的設定",
    "drafting": "AI 填寫欄位中…",
    "endFrame": "結束畫面",
    "endFrameNone": "無",
    "endFrameNext": "下一鏡的圖",
    "endFrameUpload": "自己上傳",
    "generateAll": "全部生成",
    "generateMissing": "生成尚未完成的鏡頭",
    "confirmTitle": "確認花費",
    "confirmRow": "{{id}}　{{seconds}} 秒　{{resolution}}{{end}}",
    "confirmEnd": "　有結束畫面",
    "confirmTotal": "共 {{seconds}} 秒，預估 {{price}}",
    "confirm": "確認生成",
    "cancel": "取消",
    "status": {
      "generating": "生成中 {{progress}}%",
      "completed": "完成",
      "failed": "失敗",
      "interrupted": "生成中斷，請重生"
    },
    "regenerate": "重生",
    "retry": "重試",
    "download": "下載",
    "extend": "延伸",
    "extendPlaceholder": "接下來發生什麼？",
    "prompt": "送出的英文提示詞"
  }
}
```

`locales/en.json` 對應加入：

`header`：

```json
"modeSingle": "Single shot",
"modeStoryboard": "Storyboard"
```

`errors`：

```json
"imageGenerationFailed": "Storyboard image failed, please retry"
```

最外層：

```json
"storyboard": {
  "projects": "Projects",
  "newProject": "New project",
  "deleteProject": "Delete",
  "deleteConfirm": "Delete \"{{name}}\"? Its images and videos are deleted too. This cannot be undone.",
  "empty": "No projects yet. Click \"New project\" to start",
  "loading": "Loading…",
  "steps": { "1": "Setup", "2": "Storyboard", "3": "Frames", "4": "Videos" },
  "next": "Next",
  "back": "Back",
  "cost": "Est. {{price}}",
  "costMinimum": "Est. from {{price}}",
  "setup": {
    "name": "Project name",
    "products": "Product images",
    "productsHint": "1–2 images, sent with every frame. Use a clear front view of the packaging",
    "packagingText": "Packaging text that must stay exact",
    "packagingTextPlaceholder": "e.g. PDRN Repair Black Mask",
    "ratio": "Aspect ratio",
    "ratioLocked": "The ratio is fixed once the storyboard is confirmed",
    "tone": "Tone",
    "tonePlaceholder": "e.g. premium, clean, high-tech"
  },
  "script": {
    "sourceImage": "Script image",
    "sourceImageHint": "Optional: a table or storyboard screenshot",
    "sourceText": "Script or idea",
    "sourceTextPlaceholder": "Paste a script, or describe the video: length, features to show, style…",
    "analyze": "Build storyboard",
    "reanalyze": "Rebuild",
    "analyzing": "AI is working…",
    "suggestions": "AI suggestions",
    "table": "Storyboard",
    "columns": {
      "id": "Shot",
      "seconds": "Sec",
      "visual": "Picture",
      "camera": "Camera",
      "sound": "SFX",
      "music": "Music",
      "onScreenText": "On-screen text",
      "transition": "Transition",
      "hasPackaging": "Pack"
    },
    "chatPlaceholder": "What should change? e.g. make s03 a hand holding the mask",
    "send": "Send",
    "confirm": "Confirm storyboard and make frames",
    "confirming": "Writing image prompts…",
    "needInput": "Upload a script image or enter text"
  },
  "images": {
    "generating": "Generating…",
    "generateMissing": "Generate missing frames",
    "stale": "Storyboard changed, regenerate recommended",
    "packagingHint": "Zoom in and check the packaging text",
    "regenerate": "Regenerate 2",
    "notePlaceholder": "What to change? e.g. short hair",
    "editPrompt": "Edit English prompt",
    "selected": "Selected",
    "finalSize": "Final size",
    "finalSizeHint": "1K uses the picked frame as is; 2K / 4K re-render it with the same prompt",
    "finalize": "Re-render {{count}} at {{size}}",
    "finalizing": "Re-rendering…",
    "needSelection": "Pick a frame for every shot",
    "final": "Final"
  },
  "videos": {
    "settings": "Settings for all shots",
    "drafting": "AI is filling in fields…",
    "endFrame": "End frame",
    "endFrameNone": "None",
    "endFrameNext": "Next shot's frame",
    "endFrameUpload": "Upload",
    "generateAll": "Generate all",
    "generateMissing": "Generate unfinished shots",
    "confirmTitle": "Confirm cost",
    "confirmRow": "{{id}}  {{seconds}}s  {{resolution}}{{end}}",
    "confirmEnd": "  with end frame",
    "confirmTotal": "{{seconds}}s in total, est. {{price}}",
    "confirm": "Generate",
    "cancel": "Cancel",
    "status": {
      "generating": "Generating {{progress}}%",
      "completed": "Done",
      "failed": "Failed",
      "interrupted": "Interrupted, please regenerate"
    },
    "regenerate": "Regenerate",
    "retry": "Retry",
    "download": "Download",
    "extend": "Extend",
    "extendPlaceholder": "What happens next?",
    "prompt": "English prompt sent"
  }
}
```

確認兩個檔都還是合法 JSON：`node -e "require('./locales/zh.json');require('./locales/en.json')"`。

- [ ] **Step 2: Header 加模式切換**

`components/layout/Header.tsx`：import 加 `import Link from "next/link";`，props 加 `active?: "single" | "storyboard";`（解構預設 `active = "single"`），把 app 名稱的 `<span>` 換成：

```tsx
        <div className="flex items-center gap-4">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            {t("common.appName")}
          </span>
          <div className="flex items-center gap-1 text-sm">
            {(["single", "storyboard"] as const).map((mode) => (
              <Link
                key={mode}
                href={mode === "single" ? "/" : "/storyboard"}
                className={`h-8 px-2.5 inline-flex items-center rounded-md transition-colors ${
                  active === mode ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {t(mode === "single" ? "header.modeSingle" : "header.modeStoryboard")}
              </Link>
            ))}
          </div>
        </div>
```

`app/page.tsx` 的 `<Header` 加 `active="single"`。

- [ ] **Step 3: 共用型別與 `BlobImage`**

`components/storyboard/types.ts`：

```ts
import type { ProjectUpdater } from "@/hooks/useStoryboardProject";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

export interface StepProps {
  project: StoryboardProject;
  /** Bound to this project's id, so late async results land in the right project */
  update: ProjectUpdater;
  /** Returns the user's key, or opens the key dialog and returns null */
  requireApiKey: () => string | null;
  goTo: (step: Step) => void;
}
```

`components/storyboard/BlobImage.tsx`：

```tsx
"use client";

import { useEffect, useState } from "react";

interface BlobImageProps {
  blob: Blob;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/** Shows a stored Blob, revoking its object URL when it changes */
export function BlobImage({ blob, alt, className, onClick }: BlobImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;
  // Object URLs cannot go through next/image
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} onClick={onClick} />;
}
```

- [ ] **Step 4: 專案清單與步驟條**

`components/storyboard/ProjectList.tsx`：

```tsx
"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { ProjectSummary } from "@/lib/storyboard/types";

interface ProjectListProps {
  projects: ProjectSummary[];
  activeId?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function ProjectList({ projects, activeId, onOpen, onCreate, onDelete }: ProjectListProps) {
  const { t } = useLocale();

  return (
    <aside className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{t("storyboard.projects")}</h2>
        <button
          type="button"
          onClick={onCreate}
          className="h-8 px-3 rounded-md bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {t("storyboard.newProject")}
        </button>
      </div>
      {projects.length === 0 && <p className="text-xs text-muted">{t("storyboard.empty")}</p>}
      <ul className="flex flex-col gap-1">
        {projects.map((p) => (
          <li key={p.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className={`flex-1 truncate rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                p.id === activeId ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {p.name}
              <span className="ml-2 text-xs text-muted">{t(`storyboard.steps.${p.step}`)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("storyboard.deleteConfirm", { name: p.name }))) onDelete(p.id);
              }}
              className="h-8 px-2 rounded-md text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-red-300 transition"
            >
              {t("storyboard.deleteProject")}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

`components/storyboard/StepBar.tsx`：

```tsx
"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep } from "@/lib/storyboard/shots";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

const STEPS: Step[] = [1, 2, 3, 4];

export function StepBar({ project, onSelect }: { project: StoryboardProject; onSelect: (step: Step) => void }) {
  const { t } = useLocale();

  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step) => {
        // Going back is always allowed; going forward only through the step's own button
        const reachable = step <= project.step && canEnterStep(project, step);
        return (
          <li key={step}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(step)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                project.step === step ? "border-accent text-foreground" : "border-line text-muted hover:text-foreground"
              }`}
            >
              <span className="mr-1.5 text-xs">{step}</span>
              {t(`storyboard.steps.${step}`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: 頁面**

`app/storyboard/page.tsx`：

```tsx
"use client";

import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { ProjectList } from "@/components/storyboard/ProjectList";
import { StepBar } from "@/components/storyboard/StepBar";
import { ProjectSetupStep } from "@/components/storyboard/ProjectSetupStep";
import { ScriptStep } from "@/components/storyboard/ScriptStep";
import { ShotImagesStep } from "@/components/storyboard/ShotImagesStep";
import { ShotVideosStep } from "@/components/storyboard/ShotVideosStep";
import type { StepProps } from "@/components/storyboard/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useApiKeyStatus } from "@/hooks";
import { useStoryboardProject } from "@/hooks/useStoryboardProject";
import { getApiKey } from "@/lib/storage/api-key-storage";
import type { Step } from "@/lib/storyboard/types";

const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const STEP_COMPONENTS = {
  1: ProjectSetupStep,
  2: ScriptStep,
  3: ShotImagesStep,
  4: ShotVideosStep,
} as const;

export default function StoryboardPage() {
  const { t } = useLocale();
  const apiKeyStatus = useApiKeyStatus();
  const store = useStoryboardProject();
  const { project } = store;

  // Storyboard mode always uses the user's own key (images are generated in the browser)
  const requireApiKey = () => {
    const key = getApiKey("gemini");
    if (!key) apiKeyStatus.openApiKeyModal();
    return key || null;
  };

  const StepComponent = project ? STEP_COMPONENTS[project.step] : null;
  const projectId = project?.id;
  const stepProps: StepProps | null = project
    ? {
        project,
        update: (fn) => store.update(project.id, fn),
        requireApiKey,
        goTo: (step: Step) => store.update(project.id, (p) => ({ ...p, step })),
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        active="storyboard"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onGuideClick={() => {}}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <main className="container mx-auto w-full flex-1 px-4 lg:px-6 py-8 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <ProjectList
          projects={store.projects}
          activeId={projectId}
          onOpen={store.open}
          onCreate={store.create}
          onDelete={store.remove}
        />

        <section className="flex flex-col gap-6 min-w-0">
          {store.isLoading && <p className="text-sm text-muted">{t("storyboard.loading")}</p>}
          {!store.isLoading && !project && <p className="text-sm text-muted">{t("storyboard.empty")}</p>}
          {project && stepProps && StepComponent && (
            <>
              <StepBar project={project} onSelect={stepProps.goTo} />
              <StepComponent key={project.id} {...stepProps} />
            </>
          )}
        </section>
      </main>

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
```

分鏡模式暫不提供使用說明，`onGuideClick` 傳空函式。

這一步的頁面會 import Task 11–14 才建立的四個元件。先建立四個暫時的空殼讓頁面能編譯，Task 11–14 再整個覆寫：

```bash
for name in ProjectSetupStep ScriptStep ShotImagesStep ShotVideosStep; do
cat > components/storyboard/$name.tsx <<EOF
"use client";

import type { StepProps } from "./types";

export function $name(props: StepProps) {
  return <p className="text-sm text-muted">{props.project.name}</p>;
}
EOF
done
```

- [ ] **Step 6: 檢查與手動確認**

Run: `npx tsc --noEmit -p . && npx eslint app components hooks lib`
Expected: 通過。

`pnpm dev -p 8001`，打開 http://localhost:8001/storyboard：頁首兩個模式可以互相切換；按「新專案」出現在清單、步驟條停在 1；重新整理後專案還在；刪除後消失。

- [ ] **Step 7: Commit**

```bash
git add locales components app hooks
git commit -m "feat(storyboard): Add the storyboard page shell and mode switch"
```

---

### Task 11: ① 專案設定

**Files:**
- Modify (overwrite): `components/storyboard/ProjectSetupStep.tsx`
- Create: `components/storyboard/ImagePicker.tsx`

**Interfaces:**
- Consumes: `StepProps`、`BlobImage`、`RatioSelector`（現有，`value/onChange/disabled`）、`canEnterStep`
- Produces: `<ImagePicker images={StoredImage[]} max={number} onChange={(images) => void} disabled? />`（Task 12、14 也用）

- [ ] **Step 1: `ImagePicker`**

```tsx
"use client";

import { useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { StoredImage } from "@/lib/storyboard/types";
import { BlobImage } from "./BlobImage";

interface ImagePickerProps {
  images: StoredImage[];
  max: number;
  onChange: (images: StoredImage[]) => void;
  disabled?: boolean;
}

export function ImagePicker({ images, max, onChange, disabled = false }: ImagePickerProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({ blob: file as Blob, mimeType: file.type }));
    onChange([...images, ...added].slice(0, max));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image, index) => (
        <div key={index} className="relative h-24 w-24 overflow-hidden rounded-lg border border-line">
          <BlobImage blob={image.blob} alt="" className="h-full w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white"
            >
              {t("upload.modeUploader.remove")}
            </button>
          )}
        </div>
      ))}
      {images.length < max && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-24 w-24 rounded-lg border border-dashed border-line text-xs text-muted hover:text-foreground disabled:opacity-40"
        >
          {t("upload.modeUploader.clickToUpload")}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: `ProjectSetupStep`（覆寫空殼）**

```tsx
"use client";

import { RatioSelector } from "@/components/upload/RatioSelector";
import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep } from "@/lib/storyboard/shots";
import { ImagePicker } from "./ImagePicker";
import type { StepProps } from "./types";

const inputClass =
  "w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder-gray-500 focus:border-accent focus:outline-none transition-colors";

export function ProjectSetupStep({ project, update, goTo }: StepProps) {
  const { t } = useLocale();
  const ratioLocked = project.script.confirmed;

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm text-muted">
        {t("storyboard.setup.name")}
        <input
          value={project.name}
          onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">{t("storyboard.setup.products")}</span>
        <ImagePicker
          images={project.productImages}
          max={2}
          onChange={(images) => update((p) => ({ ...p, productImages: images }))}
        />
        <p className="text-xs text-muted">{t("storyboard.setup.productsHint")}</p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-muted">
        {t("storyboard.setup.packagingText")}
        <input
          value={project.packagingText}
          placeholder={t("storyboard.setup.packagingTextPlaceholder")}
          onChange={(e) => update((p) => ({ ...p, packagingText: e.target.value }))}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <RatioSelector
          value={project.ratio}
          onChange={(ratio) => update((p) => ({ ...p, ratio }))}
          disabled={ratioLocked}
        />
        {ratioLocked && <p className="text-xs text-muted">{t("storyboard.setup.ratioLocked")}</p>}
      </div>

      <label className="flex flex-col gap-2 text-sm text-muted">
        {t("storyboard.setup.tone")}
        <input
          value={project.tone}
          placeholder={t("storyboard.setup.tonePlaceholder")}
          onChange={(e) => update((p) => ({ ...p, tone: e.target.value }))}
          className={inputClass}
        />
      </label>

      <button
        type="button"
        disabled={!canEnterStep(project, 2)}
        onClick={() => goTo(2)}
        className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-40"
      >
        {t("storyboard.next")}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 檢查與手動確認**

Run: `npx tsc --noEmit -p . && npx eslint components/storyboard`

dev server：上傳一張產品圖後「下一步」可按；填完重新整理，欄位與圖都還在。

- [ ] **Step 4: Commit**

```bash
git add components/storyboard
git commit -m "feat(storyboard): Add the project setup step"
```

---

### Task 12: ② 分鏡表

**Files:**
- Modify (overwrite): `components/storyboard/ScriptStep.tsx`
- Create: `components/storyboard/ShotTable.tsx`
- Create: `components/storyboard/ScriptChat.tsx`
- Create: `lib/storyboard/imageJobs.ts`（本 task 先建立 `generateCandidates`，Task 13 補其他函式）

**Interfaces:**
- Consumes: `parseScript`、`reviseScript`、`writeImagePrompts`（Task 5）、`mergeScriptShots`、`applyScriptEdit`（Task 1）、`imageCost`、`formatUsd`、`toFile`、`generateImage`、`buildKeyframeInstruction`、`runQueue`
- Produces:
  - `interface JobContext { projectId: string; update: ProjectUpdater; apiKey: string }`
  - `generateCandidates(ctx: JobContext, project: StoryboardProject, shotIds: string[]): Promise<void>` — 每鏡 2 張 1K，完成後附加到 `candidates`；若這鏡是過期或重生，清掉 `selected` 與 `finalImage`
  - `scriptContext(project, locale): ScriptContext`
  - `CANDIDATES_PER_SHOT = 2`

- [ ] **Step 1: `lib/storyboard/imageJobs.ts`（第一部分）**

```ts
import type { ProjectUpdater } from "@/hooks/useStoryboardProject";
import { buildKeyframeInstruction } from "@/lib/ai/image-prompts";
import type { ScriptContext } from "@/lib/ai/storyboard-prompts";
import { generateImage } from "@/services/imageService";
import type { Locale } from "@/types";
import { IMAGE_CONCURRENCY, runQueue } from "./queue";
import type { Shot, StoredImage, StoryboardProject } from "./types";

export const CANDIDATES_PER_SHOT = 2;

export interface JobContext {
  projectId: string;
  update: ProjectUpdater;
  apiKey: string;
}

export function scriptContext(project: StoryboardProject, locale: Locale): ScriptContext {
  return { ratio: project.ratio, tone: project.tone, packagingText: project.packagingText, locale };
}

export function updateShot(ctx: JobContext, shotId: string, fn: (shot: Shot) => Shot) {
  ctx.update((p) => ({ ...p, shots: p.shots.map((shot) => (shot.id === shotId ? fn(shot) : shot)) }));
}

function errorKey(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  return message.startsWith("errors.") ? message : "errors.imageGenerationFailed";
}

/**
 * Make 2 new 1K candidates for each shot; all images run through one queue
 */
export async function generateCandidates(ctx: JobContext, project: StoryboardProject, shotIds: string[]) {
  const shots = project.shots.filter((shot) => shotIds.includes(shot.id) && shot.imagePrompt);
  for (const shot of shots) {
    updateShot(ctx, shot.id, (s) => ({ ...s, imageStatus: "generating", imageError: undefined }));
  }

  const tasks = shots.flatMap((shot) =>
    Array.from({ length: CANDIDATES_PER_SHOT }, (_, index) => () =>
      generateImage({
        apiKey: ctx.apiKey,
        instruction: buildKeyframeInstruction({
          prompt: shot.imagePrompt,
          ratio: project.ratio,
          refCount: project.productImages.length,
          index,
          count: CANDIDATES_PER_SHOT,
          packagingText: shot.hasPackaging ? project.packagingText : undefined,
        }),
        images: project.productImages,
        ratio: project.ratio,
        size: "1K",
      })
    )
  );
  const results = await runQueue(tasks, { concurrency: IMAGE_CONCURRENCY });

  shots.forEach((shot, shotIndex) => {
    const mine = results.slice(shotIndex * CANDIDATES_PER_SHOT, (shotIndex + 1) * CANDIDATES_PER_SHOT);
    const images = mine.flatMap((r) => (r.ok ? [r.value as StoredImage] : []));
    const failure = mine.find((r) => !r.ok);
    updateShot(ctx, shot.id, (s) => {
      // New candidates after a change or a regenerate replace the earlier pick
      const replacing = images.length > 0 && s.candidates.length > 0;
      return {
        ...s,
        candidates: [...s.candidates, ...images],
        selected: replacing ? undefined : s.selected,
        finalImage: replacing ? undefined : s.finalImage,
        stale: images.length > 0 ? false : s.stale,
        imageStatus: images.length > 0 ? "idle" : "failed",
        imageError: images.length > 0 || !failure || failure.ok ? undefined : errorKey(failure.error),
      };
    });
  });
}
```

- [ ] **Step 2: `ShotTable`**

```tsx
"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { ScriptShot, Shot } from "@/lib/storyboard/types";

type TextKey = "visual" | "camera" | "sound" | "music" | "onScreenText" | "transition";

const TEXT_COLUMNS: TextKey[] = ["visual", "camera", "sound", "music", "onScreenText", "transition"];

interface ShotTableProps {
  shots: Shot[];
  disabled: boolean;
  onEdit: (shotId: string, row: ScriptShot) => void;
}

const cellClass =
  "w-full min-w-[6rem] bg-transparent px-2 py-1.5 text-sm text-foreground focus:bg-surface focus:outline-none resize-y";

export function ShotTable({ shots, disabled, onEdit }: ShotTableProps) {
  const { t } = useLocale();

  const edit = (shot: Shot, patch: Partial<ScriptShot>) => {
    const { id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging } = shot;
    onEdit(shot.id, { id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging, ...patch });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left">
        <thead className="text-xs text-muted">
          <tr>
            {(["id", "seconds", ...TEXT_COLUMNS, "hasPackaging"] as const).map((key) => (
              <th key={key} className="border-b border-line px-2 py-2 font-normal">
                {t(`storyboard.script.columns.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shots.map((shot) => (
            <tr key={shot.id} className="border-b border-line align-top last:border-0">
              <td className="px-2 py-1.5 text-sm text-muted">{shot.id}</td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={shot.seconds}
                  disabled={disabled}
                  onChange={(e) => edit(shot, { seconds: Number(e.target.value) || shot.seconds })}
                  className={`${cellClass} w-16 min-w-0`}
                />
              </td>
              {TEXT_COLUMNS.map((key) => (
                <td key={key}>
                  <textarea
                    rows={2}
                    value={shot[key]}
                    disabled={disabled}
                    onChange={(e) => edit(shot, { [key]: e.target.value })}
                    className={cellClass}
                  />
                </td>
              ))}
              <td className="px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={shot.hasPackaging}
                  disabled={disabled}
                  onChange={(e) => edit(shot, { hasPackaging: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: `ScriptChat`**

```tsx
"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { ChatMessage } from "@/lib/storyboard/types";

interface ScriptChatProps {
  chat: ChatMessage[];
  disabled: boolean;
  onSend: (message: string) => void;
}

export function ScriptChat({ chat, disabled, onSend }: ScriptChatProps) {
  const { t } = useLocale();
  const [message, setMessage] = useState("");

  const send = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {chat.map((m) => (
          <li
            key={m.at}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "self-end bg-accent/20 text-foreground" : "self-start bg-surface text-foreground"
            }`}
          >
            {m.text}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={message}
          disabled={disabled}
          placeholder={t("storyboard.script.chatPlaceholder")}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
          className="flex-1 bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !message.trim()}
          onClick={send}
          className="h-10 px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
        >
          {t("storyboard.script.send")}
        </button>
      </div>
    </div>
  );
}
```

（`isComposing` 判斷避免注音／倉頡選字時按 Enter 就送出。）

- [ ] **Step 4: `ScriptStep`（覆寫空殼）**

```tsx
"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { toFile } from "@/lib/storyboard/blob";
import { CANDIDATES_PER_SHOT, generateCandidates, scriptContext } from "@/lib/storyboard/imageJobs";
import { applyScriptEdit, mergeScriptShots } from "@/lib/storyboard/shots";
import type { ScriptShot, StoryboardProject } from "@/lib/storyboard/types";
import { parseScript, reviseScript, writeImagePrompts } from "@/services/storyboardService";
import { ImagePicker } from "./ImagePicker";
import { ScriptChat } from "./ScriptChat";
import { ShotTable } from "./ShotTable";
import type { StepProps } from "./types";

function toRows(project: StoryboardProject): ScriptShot[] {
  return project.shots.map(({ id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging }) => ({
    id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging,
  }));
}

export function ScriptStep({ project, update, requireApiKey, goTo }: StepProps) {
  const { t, locale } = useLocale();
  const [busy, setBusy] = useState<"analyze" | "chat" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = scriptContext(project, locale);
  const hasInput = !!project.script.sourceImage || project.script.sourceText.trim().length > 0;
  const hasShots = project.shots.length > 0;
  const needsImages = project.shots.filter((s) => s.candidates.length === 0 || s.stale);
  const confirmCost = imageCost("1K", needsImages.length * CANDIDATES_PER_SHOT);

  const run = async (kind: "analyze" | "chat" | "confirm", work: (apiKey: string) => Promise<void>) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setBusy(kind);
    setError(null);
    try {
      await work(apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.startsWith("errors.") ? t(message) : message || t("errors.analysisFailed"));
    } finally {
      setBusy(null);
    }
  };

  const applyResult = (userText: string, result: Awaited<ReturnType<typeof parseScript>>) => {
    const now = Date.now();
    update((p) => ({
      ...p,
      shots: mergeScriptShots(p.shots, result.shots),
      script: {
        ...p.script,
        confirmed: false,
        suggestions: result.suggestions,
        chat: [
          ...p.script.chat,
          { role: "user", text: userText, at: now },
          { role: "assistant", text: result.reply || "OK", at: now + 1 },
        ],
      },
    }));
  };

  const analyze = () =>
    run("analyze", async (apiKey) => {
      const result = await parseScript(
        { ...ctx, sourceText: project.script.sourceText },
        {
          source: project.script.sourceImage ? toFile(project.script.sourceImage, "script") : undefined,
          products: project.productImages.map((image, i) => toFile(image, `product-${i + 1}`)),
        },
        apiKey
      );
      applyResult(project.script.sourceText.trim() || t("storyboard.script.sourceImage"), result);
    });

  const chat = (message: string) =>
    run("chat", async (apiKey) => {
      const result = await reviseScript({ ...ctx, shots: toRows(project), chat: project.script.chat, message }, apiKey);
      applyResult(message, result);
    });

  const confirm = () =>
    run("confirm", async (apiKey) => {
      const missing = project.shots.filter((s) => !s.imagePrompt);
      const prompts = missing.length
        ? await writeImagePrompts({ ...ctx, shots: toRows(project) }, apiKey)
        : {};
      let confirmed: StoryboardProject | null = null;
      update((p) => {
        confirmed = {
          ...p,
          step: 3,
          script: { ...p.script, confirmed: true },
          shots: p.shots.map((s) => (s.imagePrompt ? s : { ...s, imagePrompt: prompts[s.id] ?? "" })),
        };
        return confirmed;
      });
      const snapshot = confirmed as StoryboardProject | null;
      if (snapshot) {
        const ids = snapshot.shots.filter((s) => s.candidates.length === 0 || s.stale).map((s) => s.id);
        // Runs in the background; results land in this project even if the user moves on
        void generateCandidates({ projectId: project.id, update, apiKey }, snapshot, ids);
      }
    });

  const editRow = (shotId: string, row: ScriptShot) =>
    update((p) => {
      const shots = p.shots.map((s, i) => (s.id === shotId ? applyScriptEdit(s, row, i === p.shots.length - 1) : s));
      return { ...p, shots, script: { ...p.script, confirmed: p.script.confirmed && shots.every((s) => s.imagePrompt) } };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">{t("storyboard.script.sourceImage")}</span>
          <ImagePicker
            images={project.script.sourceImage ? [project.script.sourceImage] : []}
            max={1}
            disabled={!!busy}
            onChange={(images) => update((p) => ({ ...p, script: { ...p.script, sourceImage: images[0] } }))}
          />
          <p className="text-xs text-muted">{t("storyboard.script.sourceImageHint")}</p>
        </div>
        <label className="flex flex-col gap-2 text-sm text-muted">
          {t("storyboard.script.sourceText")}
          <textarea
            rows={5}
            value={project.script.sourceText}
            disabled={!!busy}
            placeholder={t("storyboard.script.sourceTextPlaceholder")}
            onChange={(e) => update((p) => ({ ...p, script: { ...p.script, sourceText: e.target.value } }))}
            className="w-full bg-surface border border-line rounded-lg px-3.5 py-3 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!hasInput || !!busy}
        onClick={analyze}
        className="h-11 rounded-lg border border-line text-[15px] text-foreground hover:bg-white/5 disabled:opacity-40"
      >
        {busy === "analyze"
          ? t("storyboard.script.analyzing")
          : hasShots
            ? t("storyboard.script.reanalyze")
            : t("storyboard.script.analyze")}
      </button>
      {!hasInput && <p className="text-xs text-muted">{t("storyboard.script.needInput")}</p>}

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {project.script.suggestions.length > 0 && (
        <div className="rounded-lg border border-line px-4 py-3">
          <h3 className="mb-2 text-sm font-medium text-foreground">{t("storyboard.script.suggestions")}</h3>
          <ul className="list-disc pl-5 text-sm text-muted">
            {project.script.suggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}

      {hasShots && (
        <>
          <h3 className="text-sm font-medium text-foreground">{t("storyboard.script.table")}</h3>
          <ShotTable shots={project.shots} disabled={!!busy} onEdit={editRow} />
          <ScriptChat chat={project.script.chat} disabled={!!busy} onSend={chat} />
          <button
            type="button"
            disabled={!!busy}
            onClick={project.script.confirmed && needsImages.length === 0 ? () => goTo(3) : confirm}
            className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
          >
            {busy === "confirm"
              ? t("storyboard.script.confirming")
              : project.script.confirmed && needsImages.length === 0
                ? t("storyboard.next")
                : `${t("storyboard.script.confirm")}（${t("storyboard.cost", { price: formatUsd(confirmCost.amount) })}）`}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 檢查與手動確認**

Run: `npx tsc --noEmit -p . && npx eslint components/storyboard lib/storyboard`

dev server：在專案上傳 `/Users/mag/Desktop/20261013_PDRN黑面膜新上市/分鏡說明.jpg` 當腳本圖 → 「整理成分鏡表」→ 出現 5 鏡左右的表格與建議；在對話框輸入「s03 改成手拿面膜展示」→ 表格更新。這一步只會花文字 token（幾美分以內）。先不要按確認（會開始生圖），留到 Task 15。

- [ ] **Step 6: Commit**

```bash
git add components/storyboard lib/storyboard/imageJobs.ts
git commit -m "feat(storyboard): Add the storyboard table step with AI chat"
```

---

### Task 13: ③ 分鏡圖

**Files:**
- Modify: `lib/storyboard/imageJobs.ts`（加 `regenerateShot`、`finalizeImages`）
- Modify (overwrite): `components/storyboard/ShotImagesStep.tsx`
- Create: `components/storyboard/ShotImageCard.tsx`

**Interfaces:**
- Consumes: `generateCandidates`、`updateShot`、`JobContext`、`scriptContext`（Task 12）、`rewriteImagePrompt`、`buildFinalInstruction`、`selectCandidate`、`setFinalSize`、`imageCost`
- Produces:
  - `regenerateShot(ctx: JobContext, project: StoryboardProject, shotId: string, change: { prompt?: string; note?: string }, locale: Locale): Promise<void>`
  - `finalizeImages(ctx: JobContext, project: StoryboardProject): Promise<void>` — 對有 `selected` 但沒有 `finalImage` 的鏡頭用 `project.finalSize` 重出

- [ ] **Step 1: `imageJobs.ts` 補兩個函式**

import 加 `import { buildFinalInstruction } from "@/lib/ai/image-prompts";`（併入既有的 image-prompts import）與 `import { rewriteImagePrompt } from "@/services/storyboardService";`，檔尾加：

```ts
/**
 * Regenerate one shot, optionally after editing its prompt or describing a change
 */
export async function regenerateShot(
  ctx: JobContext,
  project: StoryboardProject,
  shotId: string,
  change: { prompt?: string; note?: string },
  locale: Locale
) {
  const shot = project.shots.find((s) => s.id === shotId);
  if (!shot) return;
  let prompt = change.prompt?.trim() || shot.imagePrompt;
  if (change.note?.trim()) {
    updateShot(ctx, shotId, (s) => ({ ...s, imageStatus: "generating", imageError: undefined }));
    try {
      prompt = await rewriteImagePrompt(
        { ...scriptContext(project, locale), shot, currentPrompt: prompt, note: change.note },
        ctx.apiKey
      );
    } catch (err) {
      updateShot(ctx, shotId, (s) => ({ ...s, imageStatus: "failed", imageError: errorKey(err) }));
      return;
    }
  }
  updateShot(ctx, shotId, (s) => ({ ...s, imagePrompt: prompt }));
  const next = { ...project, shots: project.shots.map((s) => (s.id === shotId ? { ...s, imagePrompt: prompt } : s)) };
  await generateCandidates(ctx, next, [shotId]);
}

/**
 * Re-render the picked frames at 2K / 4K
 */
export async function finalizeImages(ctx: JobContext, project: StoryboardProject) {
  const shots = project.shots.filter((s) => s.selected !== undefined && !s.finalImage);
  for (const shot of shots) {
    updateShot(ctx, shot.id, (s) => ({ ...s, imageStatus: "generating", imageError: undefined }));
  }
  const results = await runQueue(
    shots.map((shot) => () =>
      generateImage({
        apiKey: ctx.apiKey,
        instruction: buildFinalInstruction({
          prompt: shot.imagePrompt,
          ratio: project.ratio,
          productCount: project.productImages.length,
          packagingText: shot.hasPackaging ? project.packagingText : undefined,
        }),
        images: [shot.candidates[shot.selected!], ...project.productImages],
        ratio: project.ratio,
        size: project.finalSize,
      })
    ),
    { concurrency: IMAGE_CONCURRENCY }
  );
  shots.forEach((shot, i) => {
    const result = results[i];
    updateShot(ctx, shot.id, (s) =>
      result.ok
        ? { ...s, finalImage: result.value, imageStatus: "idle" }
        : { ...s, imageStatus: "failed", imageError: errorKey(result.error) }
    );
  });
}
```

- [ ] **Step 2: `ShotImageCard`**

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useLocale } from "@/contexts/LocaleContext";
import type { Shot } from "@/lib/storyboard/types";
import { BlobImage } from "./BlobImage";

interface ShotImageCardProps {
  shot: Shot;
  ratioClass: string;
  onSelect: (index: number) => void;
  onRegenerate: (change: { prompt?: string; note?: string }) => void;
}

export function ShotImageCard({ shot, ratioClass, onSelect, onRegenerate }: ShotImageCardProps) {
  const { t } = useLocale();
  const [note, setNote] = useState("");
  const [prompt, setPrompt] = useState(shot.imagePrompt);
  const [zoom, setZoom] = useState<number | null>(null);
  const busy = shot.imageStatus === "generating";

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            {shot.id} · {shot.seconds}s
          </h3>
          <p className="mt-1 text-sm text-muted">{shot.visual}</p>
        </div>
        {shot.finalImage && <span className="shrink-0 text-xs text-accent">{t("storyboard.images.final")}</span>}
      </header>

      {shot.stale && <p className="text-xs text-amber-300">{t("storyboard.images.stale")}</p>}
      {shot.hasPackaging && <p className="text-xs text-muted">{t("storyboard.images.packagingHint")}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shot.candidates.map((image, index) => (
          <div key={index} className="flex flex-col gap-1">
            <BlobImage
              blob={image.blob}
              alt={`${shot.id}-${index + 1}`}
              onClick={() => setZoom(index)}
              className={`${ratioClass} w-full cursor-zoom-in rounded-md object-cover ${
                shot.selected === index ? "ring-2 ring-accent" : ""
              }`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(index)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
                shot.selected === index ? "border-accent text-foreground" : "border-line text-muted hover:text-foreground"
              }`}
            >
              {shot.selected === index ? t("storyboard.images.selected") : `${index + 1}`}
            </button>
          </div>
        ))}
        {busy && (
          <div className={`${ratioClass} flex items-center justify-center rounded-md border border-dashed border-line text-xs text-muted`}>
            {t("storyboard.images.generating")}
          </div>
        )}
      </div>

      {shot.imageError && (
        <p role="alert" className="text-xs text-red-300">
          {t(shot.imageError)}
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={note}
          disabled={busy}
          placeholder={t("storyboard.images.notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onRegenerate({ note, prompt: prompt !== shot.imagePrompt ? prompt : undefined });
            setNote("");
          }}
          className="h-9 shrink-0 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
        >
          {t("storyboard.images.regenerate")}
        </button>
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">{t("storyboard.images.editPrompt")}</summary>
        <textarea
          rows={4}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-2 w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        />
      </details>

      <Modal isOpen={zoom !== null} onClose={() => setZoom(null)} size="xl">
        {zoom !== null && shot.candidates[zoom] && (
          <BlobImage blob={shot.candidates[zoom].blob} alt="" className="w-full rounded-md" />
        )}
      </Modal>
    </article>
  );
}
```

- [ ] **Step 3: `ShotImagesStep`（覆寫空殼）**

```tsx
"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { CANDIDATES_PER_SHOT, finalizeImages, generateCandidates, regenerateShot } from "@/lib/storyboard/imageJobs";
import { canEnterStep, selectCandidate, setFinalSize } from "@/lib/storyboard/shots";
import type { ImageSize } from "@/types";
import { ShotImageCard } from "./ShotImageCard";
import type { StepProps } from "./types";

const SIZES: ImageSize[] = ["1K", "2K", "4K"];

export function ShotImagesStep({ project, update, requireApiKey, goTo }: StepProps) {
  const { t, locale } = useLocale();
  const [finalizing, setFinalizing] = useState(false);

  const ratioClass = project.ratio === "9:16" ? "aspect-[9/16]" : "aspect-video";
  const missing = project.shots.filter(
    (s) => (s.candidates.length === 0 || s.stale) && s.imageStatus !== "generating"
  );
  const toFinalize = project.shots.filter((s) => s.selected !== undefined && !s.finalImage);
  const allSelected = project.shots.every((s) => s.selected !== undefined);
  const anyBusy = project.shots.some((s) => s.imageStatus === "generating");

  const withKey = (work: (apiKey: string) => void) => {
    const apiKey = requireApiKey();
    if (apiKey) work(apiKey);
  };
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });

  const finalize = () =>
    withKey(async (apiKey) => {
      const cost = imageCost(project.finalSize, toFinalize.length);
      const ok = window.confirm(
        `${t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}\n${t("storyboard.cost", { price: formatUsd(cost.amount) })}`
      );
      if (!ok) return;
      setFinalizing(true);
      await finalizeImages(jobCtx(apiKey), project);
      setFinalizing(false);
    });

  return (
    <div className="flex flex-col gap-6">
      {missing.length > 0 && (
        <button
          type="button"
          onClick={() => withKey((apiKey) => void generateCandidates(jobCtx(apiKey), project, missing.map((s) => s.id)))}
          className="h-10 self-start px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5"
        >
          {t("storyboard.images.generateMissing")}（
          {t("storyboard.cost", { price: formatUsd(imageCost("1K", missing.length * CANDIDATES_PER_SHOT).amount) })}）
        </button>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {project.shots.map((shot) => (
          <ShotImageCard
            key={`${shot.id}-${shot.imagePrompt}`}
            shot={shot}
            ratioClass={ratioClass}
            onSelect={(index) =>
              update((p) => ({
                ...p,
                shots: p.shots.map((s) => (s.id === shot.id ? selectCandidate(s, index, p.finalSize) : s)),
              }))
            }
            onRegenerate={(change) =>
              withKey((apiKey) => void regenerateShot(jobCtx(apiKey), project, shot.id, change, locale))
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <span className="text-sm text-muted">{t("storyboard.images.finalSize")}</span>
        <div className="grid grid-cols-3 gap-2 max-w-sm">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              disabled={anyBusy}
              onClick={() => update((p) => setFinalSize(p, size))}
              className={`py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 ${
                project.finalSize === size ? "bg-surface-raised border-accent text-foreground" : "border-line text-muted"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t("storyboard.images.finalSizeHint")}</p>
        {project.finalSize !== "1K" && toFinalize.length > 0 && (
          <button
            type="button"
            disabled={!allSelected || finalizing || anyBusy}
            onClick={finalize}
            className="h-10 self-start px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
          >
            {finalizing
              ? t("storyboard.images.finalizing")
              : t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}
          </button>
        )}
      </div>

      {!allSelected && <p className="text-xs text-muted">{t("storyboard.images.needSelection")}</p>}
      <button
        type="button"
        disabled={!canEnterStep(project, 4)}
        onClick={() => goTo(4)}
        className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
      >
        {t("storyboard.next")}
      </button>
    </div>
  );
}
```

注意 `window.confirm` 會阻擋瀏覽器自動化工具；Task 15 用瀏覽器測試時，定稿只測 1K（不出現 confirm）。

- [ ] **Step 4: 檢查**

Run: `npx tsc --noEmit -p . && npx eslint components/storyboard lib/storyboard && pnpm test`

- [ ] **Step 5: Commit**

```bash
git add components/storyboard lib/storyboard/imageJobs.ts
git commit -m "feat(storyboard): Add the storyboard frames step"
```

---

### Task 14: ④ 影片

**Files:**
- Create: `lib/storyboard/videoJobs.ts`
- Test: `lib/storyboard/videoJobs.test.ts`
- Modify: `components/workspace/PromptEditor.tsx`（`onGenerate` 改為選填）
- Modify (overwrite): `components/storyboard/ShotVideosStep.tsx`
- Create: `components/storyboard/ShotVideoCard.tsx`
- Create: `components/storyboard/BatchCostConfirm.tsx`

**Interfaces:**
- Consumes: `draftPrompt`、`composePrompt`（`services/videoService`）、`runVideoJob`、`runExtendJob`、`toDisplayError`、`endFrameImage`、`shotDescription`、`videoFileName`、`videoCost`、`sumCosts`、`runQueue`、`JobContext`、`updateShot`、`toFile`
- Produces:
  - `toStoredVideo(url: string, fetcher?: (url: string) => Promise<Blob>): Promise<{ blob?: Blob; url?: string }>`
  - `draftShotFields(ctx, project, locale): Promise<void>` — 為沒有 `fields` 的鏡頭填欄位
  - `generateShotVideos(ctx, project, shotIds, locale): Promise<void>`
  - `extendShotVideo(ctx, project, shotId, prompt, seconds): Promise<void>`
  - `interface CostRow { id: string; seconds: number; resolution: VideoResolution; hasEnd: boolean }`、`costRows(project, shotIds): CostRow[]`

- [ ] **Step 1: 寫失敗的測試**

`lib/storyboard/videoJobs.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { newProject, toShot } from "./shots";
import { costRows, toStoredVideo } from "./videoJobs";
import type { ScriptShot } from "./types";

const row = (id: string, transition = "硬切"): ScriptShot => ({
  id, seconds: 5, visual: id, camera: "", sound: "", music: "無", onScreenText: "", transition, hasPackaging: false,
});

describe("toStoredVideo", () => {
  it("stores a Blob when the video can be downloaded", async () => {
    const blob = new Blob(["video"]);
    expect(await toStoredVideo("blob:x", async () => blob)).toEqual({ blob });
  });
  it("keeps the URL when the download fails", async () => {
    const failing = async () => { throw new Error("CORS"); };
    expect(await toStoredVideo("https://example.com/v.mp4", failing)).toEqual({ url: "https://example.com/v.mp4" });
  });
});

describe("costRows", () => {
  it("lists seconds, resolution and end frames per shot", () => {
    const p = newProject("id", 0);
    p.videoSettings.resolution = "1080p";
    p.shots = [toShot(row("s01", "溶接"), false), toShot(row("s02"), true)];
    p.shots[1] = { ...p.shots[1], finalImage: { blob: new Blob(["b"]), mimeType: "image/png" } };
    expect(costRows(p, ["s01", "s02"])).toEqual([
      { id: "s01", seconds: 6, resolution: "1080p", hasEnd: true },
      { id: "s02", seconds: 6, resolution: "1080p", hasEnd: false },
    ]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/storyboard/videoJobs.test.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作 `lib/storyboard/videoJobs.ts`**

```ts
import type { PromptContext } from "@/lib/ai/prompts";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import { composePrompt, draftPrompt } from "@/services/videoService";
import type { Locale, VideoResolution } from "@/types";
import { toFile } from "./blob";
import { updateShot, type JobContext } from "./imageJobs";
import { DRAFT_CONCURRENCY, VIDEO_CONCURRENCY, runQueue } from "./queue";
import { endFrameImage, shotDescription } from "./shots";
import type { StoryboardProject } from "./types";

const fetchBlob = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
};

/** Keep the video as a Blob so it survives reloads; fall back to the URL if it cannot be fetched */
export async function toStoredVideo(
  url: string,
  fetcher: (url: string) => Promise<Blob> = fetchBlob
): Promise<{ blob?: Blob; url?: string }> {
  try {
    return { blob: await fetcher(url) };
  } catch {
    return { url };
  }
}

export interface CostRow {
  id: string;
  seconds: number;
  resolution: VideoResolution;
  hasEnd: boolean;
}

export function costRows(project: StoryboardProject, shotIds: string[]): CostRow[] {
  return project.shots.flatMap((shot, index) =>
    shotIds.includes(shot.id)
      ? [{
          id: shot.id,
          seconds: shot.duration,
          resolution: project.videoSettings.resolution,
          hasEnd: shot.endFrame.kind === "next" ? index < project.shots.length - 1 : shot.endFrame.kind === "upload",
        }]
      : []
  );
}

function promptContext(project: StoryboardProject, index: number, locale: Locale): PromptContext {
  const shot = project.shots[index];
  const hasEnd = !!endFrameImage(project.shots, index);
  return {
    imageCount: hasEnd ? 2 : 1,
    mode: hasEnd ? "frames_to_video" : "single_image",
    ratio: project.ratio,
    duration: shot.duration,
    audioMode: project.videoSettings.audioMode,
    locale,
  };
}

/**
 * Fill the five shot fields for every shot that has none (same draft as the single-shot mode)
 */
export async function draftShotFields(ctx: JobContext, project: StoryboardProject, locale: Locale) {
  const targets = project.shots.flatMap((shot, index) => (!shot.fields && shot.finalImage ? [{ shot, index }] : []));
  await runQueue(
    targets.map(({ shot, index }) => async () => {
      const pc = promptContext(project, index, locale);
      const draft = await draftPrompt(
        [toFile(shot.finalImage!, shot.id)],
        { description: shotDescription(shot), mode: "single_image", ratio: pc.ratio, duration: pc.duration, audioMode: pc.audioMode, locale },
        ctx.apiKey
      );
      updateShot(ctx, shot.id, (s) => ({
        ...s,
        draft,
        fields: s.fields ?? {
          subject: draft.fields.subject.value,
          setting: draft.fields.setting.value,
          camera: draft.fields.camera.value,
          lighting: draft.fields.lighting.value,
          sound: draft.fields.sound.value,
        },
      }));
    }),
    { concurrency: DRAFT_CONCURRENCY }
  );
}

/**
 * Compose, generate and store the video of each shot; shots fail independently
 */
export async function generateShotVideos(ctx: JobContext, project: StoryboardProject, shotIds: string[], locale: Locale) {
  const targets = project.shots.flatMap((shot, index) =>
    shotIds.includes(shot.id) && shot.fields && shot.finalImage ? [{ shot, index }] : []
  );
  for (const { shot } of targets) {
    updateShot(ctx, shot.id, (s) => ({
      ...s,
      video: { status: "generating", progress: 0, prompt: "", duration: s.duration },
    }));
  }

  await runQueue(
    targets.map(({ shot, index }) => async () => {
      try {
        const pc = promptContext(project, index, locale);
        const prompt = await composePrompt(shot.fields!, pc, ctx.apiKey);
        updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, prompt } }));
        const result = await runVideoJob(
          {
            prompt,
            ratio: project.ratio,
            resolution: project.videoSettings.resolution,
            duration: shot.duration,
            audioMode: project.videoSettings.audioMode,
            startImage: shot.finalImage!.blob,
            endImage: endFrameImage(project.shots, index)?.blob,
          },
          {
            apiKey: ctx.apiKey,
            isCancelled: () => false,
            onProgress: (progress) =>
              updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, progress } })),
          }
        );
        if (!result) return;
        const stored = await toStoredVideo(result.videoUrl);
        updateShot(ctx, shot.id, (s) => ({
          ...s,
          video: {
            status: "completed",
            progress: 100,
            prompt,
            ...stored,
            sourceVideoUri: result.sourceVideoUri,
            duration: shot.duration,
          },
        }));
      } catch (err) {
        updateShot(ctx, shot.id, (s) => ({
          ...s,
          video: {
            status: "failed",
            progress: 0,
            prompt: s.video?.prompt ?? "",
            duration: shot.duration,
            error: toDisplayError(err instanceof Error ? err.message : ""),
          },
        }));
        // Let the queue retry rate limits
        throw err;
      }
    }),
    { concurrency: VIDEO_CONCURRENCY }
  );
}

/**
 * Extend a finished shot; the previous video stays if the extension fails
 */
export async function extendShotVideo(
  ctx: JobContext,
  project: StoryboardProject,
  shotId: string,
  prompt: string,
  seconds: number
) {
  const shot = project.shots.find((s) => s.id === shotId);
  const previous = shot?.video;
  if (!shot || !previous?.sourceVideoUri) return;
  updateShot(ctx, shotId, (s) => ({ ...s, video: { ...previous, status: "generating", progress: 0, error: undefined } }));
  try {
    const result = await runExtendJob(
      {
        prompt,
        sourceVideoUri: previous.sourceVideoUri,
        ratio: project.ratio,
        resolution: project.videoSettings.resolution,
        audioMode: project.videoSettings.audioMode,
        extensionDuration: seconds,
      },
      {
        apiKey: ctx.apiKey,
        isCancelled: () => false,
        onProgress: (progress) => updateShot(ctx, shotId, (s) => ({ ...s, video: s.video && { ...s.video, progress } })),
      }
    );
    if (!result) return;
    const stored = await toStoredVideo(result.videoUrl);
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: {
        ...previous,
        blob: stored.blob,
        url: stored.url,
        status: "completed",
        progress: 100,
        sourceVideoUri: result.sourceVideoUri ?? previous.sourceVideoUri,
        duration: previous.duration + seconds,
      },
    }));
  } catch (err) {
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: { ...previous, status: "completed", error: toDisplayError(err instanceof Error ? err.message : "") },
    }));
  }
}
```

注意：`generateShotVideos` 的 catch 會重新丟出錯誤，讓佇列對 429 重試；重試時卡片會先顯示失敗、再回到生成中，這是可接受的。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test lib/storyboard/videoJobs.test.ts`
Expected: PASS。

- [ ] **Step 5: `PromptEditor` 的 `onGenerate` 改為選填**

`components/workspace/PromptEditor.tsx`：props 型別改 `onGenerate?: () => void;`，按鈕外面包 `{onGenerate && ( ... )}`。單鏡模式照樣傳入，行為不變。

- [ ] **Step 6: `BatchCostConfirm`**

```tsx
"use client";

import { Modal } from "@/components/common/Modal";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import type { CostRow } from "@/lib/storyboard/videoJobs";

interface BatchCostConfirmProps {
  rows: CostRow[] | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function BatchCostConfirm({ rows, onConfirm, onClose }: BatchCostConfirmProps) {
  const { t } = useLocale();
  if (!rows) return null;

  const total = sumCosts(rows.map((r) => videoCost(r.seconds, r.resolution)));
  const seconds = rows.reduce((sum, r) => sum + r.seconds, 0);
  const price = formatUsd(total.amount) + (total.isMinimum ? "+" : "");

  return (
    <Modal isOpen onClose={onClose} title={t("storyboard.videos.confirmTitle")}>
      <ul className="mb-4 flex flex-col gap-1 text-sm text-foreground">
        {rows.map((r) => (
          <li key={r.id}>
            {t("storyboard.videos.confirmRow", {
              id: r.id,
              seconds: r.seconds,
              resolution: r.resolution,
              end: r.hasEnd ? t("storyboard.videos.confirmEnd") : "",
            })}
          </li>
        ))}
      </ul>
      <p className="mb-4 text-sm text-muted">{t("storyboard.videos.confirmTotal", { seconds, price })}</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-line text-sm text-foreground">
          {t("storyboard.videos.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
        >
          {t("storyboard.videos.confirm")}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 7: `ShotVideoCard`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { DurationSelector } from "@/components/upload/DurationSelector";
import { PromptEditor } from "@/components/workspace/PromptEditor";
import { useLocale } from "@/contexts/LocaleContext";
import { videoFileName } from "@/lib/storyboard/shots";
import type { EndFrame, Shot } from "@/lib/storyboard/types";
import type { PromptFieldKey, VideoDuration } from "@/types";
import { BlobImage } from "./BlobImage";
import { ImagePicker } from "./ImagePicker";

const EXTEND_STEPS = [4, 6, 8];

interface ShotVideoCardProps {
  shot: Shot;
  isLast: boolean;
  ratioClass: string;
  onFieldChange: (key: PromptFieldKey, value: string) => void;
  onDurationChange: (duration: VideoDuration) => void;
  onEndFrameChange: (endFrame: EndFrame) => void;
  onGenerate: () => void;
  onExtend: (prompt: string, seconds: number) => void;
}

function useVideoSrc(shot: Shot): string | undefined {
  const blob = shot.video?.blob;
  const [blobUrl, setBlobUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return blob ? blobUrl : shot.video?.url;
}

export function ShotVideoCard(props: ShotVideoCardProps) {
  const { shot, isLast, ratioClass } = props;
  const { t } = useLocale();
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendSeconds, setExtendSeconds] = useState(4);
  const src = useVideoSrc(shot);
  const video = shot.video;
  const busy = video?.status === "generating";

  const download = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = videoFileName(shot);
    a.click();
  };

  return (
    <article className="grid gap-4 rounded-lg border border-line p-4 lg:grid-cols-[12rem_minmax(0,1fr)_16rem]">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">{shot.id} · {shot.visual}</h3>
        {shot.finalImage && <BlobImage blob={shot.finalImage.blob} alt={shot.id} className={`${ratioClass} w-full rounded-md object-cover`} />}
        <DurationSelector value={shot.duration} onChange={props.onDurationChange} disabled={busy} />
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("storyboard.videos.endFrame")}
          <select
            value={shot.endFrame.kind}
            disabled={busy}
            onChange={(e) => {
              const kind = e.target.value as EndFrame["kind"];
              if (kind !== "upload") props.onEndFrameChange({ kind });
            }}
            className="bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-foreground"
          >
            <option value="none">{t("storyboard.videos.endFrameNone")}</option>
            {!isLast && <option value="next">{t("storyboard.videos.endFrameNext")}</option>}
            <option value="upload">{t("storyboard.videos.endFrameUpload")}</option>
          </select>
        </label>
        <ImagePicker
          images={shot.endFrame.kind === "upload" ? [shot.endFrame.image] : []}
          max={1}
          disabled={busy}
          onChange={(images) => props.onEndFrameChange(images[0] ? { kind: "upload", image: images[0] } : { kind: "none" })}
        />
      </div>

      <div className="min-w-0">
        {shot.draft && shot.fields ? (
          <PromptEditor draft={shot.draft} fields={shot.fields} isBusy={busy} onFieldChange={props.onFieldChange} />
        ) : (
          <p className="text-sm text-muted">{t("storyboard.videos.drafting")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {video && (
          <p className={`text-xs ${video.status === "failed" ? "text-red-300" : "text-muted"}`}>
            {t(`storyboard.videos.status.${video.status}`, { progress: video.progress })}
          </p>
        )}
        {video?.error && <p role="alert" className="text-xs text-red-300">{video.error.startsWith("errors.") ? t(video.error) : video.error}</p>}
        {src && <video src={src} controls playsInline className={`${ratioClass} w-full rounded-md bg-black`} />}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !shot.fields}
            onClick={props.onGenerate}
            className="h-9 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
          >
            {video?.status === "failed" ? t("storyboard.videos.retry") : t("storyboard.videos.regenerate")}
          </button>
          {src && (
            <button type="button" onClick={download} className="h-9 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5">
              {t("storyboard.videos.download")}
            </button>
          )}
        </div>
        {video?.status === "completed" && video.sourceVideoUri && (
          <div className="flex flex-col gap-2">
            <input
              value={extendPrompt}
              placeholder={t("storyboard.videos.extendPlaceholder")}
              onChange={(e) => setExtendPrompt(e.target.value)}
              className="bg-surface border border-line rounded-md px-2.5 py-1.5 text-sm text-foreground"
            />
            <div className="flex gap-2">
              <select
                value={extendSeconds}
                onChange={(e) => setExtendSeconds(Number(e.target.value))}
                className="bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-foreground"
              >
                {EXTEND_STEPS.map((s) => <option key={s} value={s}>{s}s</option>)}
              </select>
              <button
                type="button"
                disabled={!extendPrompt.trim()}
                onClick={() => props.onExtend(extendPrompt, extendSeconds)}
                className="h-9 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                {t("storyboard.videos.extend")}
              </button>
            </div>
          </div>
        )}
        {video?.prompt && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer select-none">{t("storyboard.videos.prompt")}</summary>
            <p className="mt-1 whitespace-pre-wrap">{video.prompt}</p>
          </details>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 8: `ShotVideosStep`（覆寫空殼）**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AudioModeSelector } from "@/components/upload/AudioModeSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { useLocale } from "@/contexts/LocaleContext";
import { costRows, draftShotFields, extendShotVideo, generateShotVideos, type CostRow } from "@/lib/storyboard/videoJobs";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import type { Shot } from "@/lib/storyboard/types";
import { BatchCostConfirm } from "./BatchCostConfirm";
import { ShotVideoCard } from "./ShotVideoCard";
import type { StepProps } from "./types";

export function ShotVideosStep({ project, update, requireApiKey }: StepProps) {
  const { t, locale } = useLocale();
  const [pending, setPending] = useState<{ rows: CostRow[]; run: () => void } | null>(null);
  const drafted = useRef(false);

  const ratioClass = project.ratio === "9:16" ? "aspect-[9/16]" : "aspect-video";
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });
  const unfinished = project.shots.filter((s) => s.video?.status !== "completed" && s.video?.status !== "generating");

  // Fill fields once when the step opens
  useEffect(() => {
    if (drafted.current || project.shots.every((s) => s.fields)) return;
    drafted.current = true;
    const apiKey = requireApiKey();
    if (apiKey) void draftShotFields(jobCtx(apiKey), project, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmGenerate = (shotIds: string[]) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: costRows(project, shotIds),
      run: () => void generateShotVideos(jobCtx(apiKey), project, shotIds, locale),
    });
  };

  const confirmExtend = (shotId: string, prompt: string, seconds: number) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: [{ id: shotId, seconds, resolution: project.videoSettings.resolution, hasEnd: false }],
      run: () => void extendShotVideo(jobCtx(apiKey), project, shotId, prompt, seconds),
    });
  };

  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));

  const setSettings = (patch: Partial<typeof project.videoSettings>) =>
    update((p) => ({ ...p, videoSettings: { ...p.videoSettings, ...patch } }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-lg border border-line p-4 md:grid-cols-2">
        <span className="text-sm font-medium text-foreground md:col-span-2">{t("storyboard.videos.settings")}</span>
        <ResolutionSelector value={project.videoSettings.resolution} onChange={(resolution) => setSettings({ resolution })} />
        <AudioModeSelector value={project.videoSettings.audioMode} onChange={(audioMode) => setSettings({ audioMode })} />
      </div>

      <button
        type="button"
        disabled={unfinished.length === 0 || unfinished.some((s) => !s.fields)}
        onClick={() => confirmGenerate(unfinished.map((s) => s.id))}
        className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
      >
        {unfinished.length === project.shots.length ? t("storyboard.videos.generateAll") : t("storyboard.videos.generateMissing")}
        {unfinished.length > 0 &&
          `（${t("storyboard.cost", {
            price: formatUsd(sumCosts(unfinished.map((s) => videoCost(s.duration, project.videoSettings.resolution))).amount),
          })}）`}
      </button>

      {project.shots.map((shot, index) => (
        <ShotVideoCard
          key={shot.id}
          shot={shot}
          isLast={index === project.shots.length - 1}
          ratioClass={ratioClass}
          onFieldChange={(key, value) =>
            patchShot(shot.id, (s) => (s.fields ? { ...s, fields: { ...s.fields, [key]: value } } : s))
          }
          onDurationChange={(duration) => patchShot(shot.id, (s) => ({ ...s, duration }))}
          onEndFrameChange={(endFrame) => patchShot(shot.id, (s) => ({ ...s, endFrame }))}
          onGenerate={() => confirmGenerate([shot.id])}
          onExtend={(prompt, seconds) => confirmExtend(shot.id, prompt, seconds)}
        />
      ))}

      <BatchCostConfirm
        rows={pending?.rows ?? null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 9: 檢查**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint .`
Expected: 全部通過（既有 `<img>` warning 可忽略）。

- [ ] **Step 10: Commit**

```bash
git add lib/storyboard/videoJobs.ts lib/storyboard/videoJobs.test.ts components
git commit -m "feat(storyboard): Add the batch video step"
```

---

### Task 15: 端到端驗證

**Files:** 無（只有修正時才改檔）

- [ ] **Step 1: 全部檢查**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint . && pnpm build`
Expected: 測試全過、型別無錯、lint 無錯、build 成功。另跑 `NEXT_PUBLIC_BUILD_MODE=static pnpm build` 確認靜態版也能 build（`app/storyboard` 必須能 static export），完成後刪掉產生的 `dist/` 變更（`git checkout -- dist` 或 `git status` 確認沒有誤加）。

- [ ] **Step 2: 用 mock 影片跑完整流程**

```bash
VIDEO_PROVIDER=mock pnpm dev -p 8001
```

用瀏覽器（Claude in Chrome）在 http://localhost:8001/storyboard：

1. 新專案 → 產品圖用 `/Users/mag/Desktop/20261013_PDRN黑面膜新上市/` 裡的產品圖（先 `ls` 確認檔名；沒有的話請使用者提供），包裝文字「PDRN 極潤修護黑面膜」，比例 9:16 → 下一步。
2. 腳本圖用 `分鏡說明.jpg` → 整理成分鏡表。Expected：5 鏡左右，畫面文字照原文。
3. 對話「s03 改成手拿面膜展示」→ s03 更新、其他鏡不變。
4. 確認分鏡表（**會花生圖費用，約 $0.34**，先跟使用者確認）→ 進入 ③，各鏡出現 2 張候選。
5. 生成途中重新整理頁面 → 候選圖狀態回到可重生，不會卡住（Review Focus 1）。
6. 每鏡選圖（定稿尺寸維持 1K）→ 下一步。
7. 回到 ② 改 s02 的畫面描述 → ③ 的 s02 顯示過期、④ 步驟條無法前往（Review Focus 2）。重生 s02、選圖後恢復。
8. ④：欄位自動填好；全部生成 → 確認視窗列出秒數與總額 → 確認 → mock 影片完成、可播放、可下載（Review Focus 5：mock 是遠端網址，Blob 下載可能失敗，仍要能播放）。
9. 生成途中切換到另一個專案再切回來 → 結果寫回原專案。
10. 切換語系到英文，各步驟文字都有翻譯、沒有出現 `storyboard.xxx` 這種 key。

- [ ] **Step 3: 單鏡模式回歸**

在 http://localhost:8001/ 用「直接生成」跑一次 mock，確認行為與改版前相同。

- [ ] **Step 4: 實際生一鏡（由使用者決定）**

問使用者是否要用真的 Omni 生一鏡（約 $0.40–0.60）。同意的話用 `pnpm dev -p 8001`（不設 `VIDEO_PROVIDER=mock`）在 ④ 只對一鏡按「重生」。

- [ ] **Step 5: Commit 修正**

若過程中有修正：

```bash
git add -A
git commit -m "fix(storyboard): <修正內容>"
```
