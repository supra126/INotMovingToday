# 分鏡模式（Storyboard Mode）設計

日期：2026-10-13
狀態：待審

## 目標

把本地 `ai-video` plugin 的 `storyboard` 流程搬上網頁：從腳本（圖或文字）走到分鏡表、分鏡圖，再批次生成每一鏡的影片，一條龍在 INotMovingToday 網頁上完成。線上版（inotmoving.simoko.com）給同事用，每個人用自己的 Gemini key。

現有的「單鏡生成」（首頁：主圖＋描述 → 影片）保留不動，分鏡模式是第二種工作模式。

## 使用情境

- 輸入可能只有**腳本圖**、只有**文字**，或兩者都給。
  - 腳本圖通常是表格形式的腳本截圖（每列一鏡：畫面重點、畫面文字），例如 `20261013_PDRN黑面膜新上市/分鏡說明.jpg`。AI 讀表後給建議。
  - 文字是想法或企劃，AI 先跟使用者討論，再整理成分鏡表。
- 專案做完就刪，不需要長期保存、匯出或分享。
- 交付物是每一鏡的影片，使用者各自下載後在剪輯軟體接片、配樂、上字卡。

## 範圍

**這次做**

- `/storyboard` 頁面，四個步驟（下述），首頁和分鏡頁的頁首互相切換。
- IndexedDB 專案儲存與專案清單（可刪除）。
- 分鏡表的 AI 流程：讀腳本圖或文字 → 分鏡表＋建議 → 對話修改 → 為每鏡寫英文生圖 prompt。
- Nano Banana 生圖（候選、重生、定稿重出）。
- 每鏡卡片式批次生成影片（重用單鏡模式的欄位編輯與生成流程）。
- 生圖與生影片的預估費用顯示。
- 中英文語系。
- 純邏輯的 Vitest 單元測試。

**這次不做**

- 粗剪、接片、配樂、字卡（`post`）。
- 多提案（`campaign`）、獨立產品照模式（`product-shot`）。
- 雲端儲存、帳號、分享、專案匯出／匯入。
- CLI 改為 import 共用的 `lib/ai/image-prompts.ts`（之後再做）。

## 頁面與步驟

`app/storyboard/page.tsx`。上方是步驟條，可以點回前面的步驟查看與修改；往後只能按該步驟的「下一步」，這就是關卡。

| 步驟 | 內容 | AI | 關卡 |
|---|---|---|---|
| ① 專案設定 | 專案名、產品圖 1–2 張、包裝上不能錯的字、比例、調性 | 無 | 產品圖與比例必填 |
| ② 分鏡表 | 腳本圖／文字 → 分鏡表＋建議 → 對話修改 | Gemini 文字 | **關卡 1：確認分鏡表** |
| ③ 分鏡圖 | 每鏡 2 張 1K 候選 → 挑圖／重生 → 定稿 | Nano Banana | **關卡 2：每鏡都選好圖** |
| ④ 影片 | 每鏡卡片 → 確認總額 → 批次生成 → 下載 | Omni | **關卡 3：確認花費** |

回到前面步驟修改時，受影響的後續資料不自動刪除，而是標示為「過期」（例如改了某鏡的畫面描述，該鏡的候選圖顯示「分鏡已修改，建議重生」）。

### ① 專案設定

- 專案名稱（預設為日期＋第一張產品圖檔名）。
- 產品圖 1–2 張（必填至少 1 張），每次生分鏡圖都會帶上。
- 包裝上不能錯的字（選填，例如「PDRN 極潤修護黑面膜」），寫進生圖與影片的提示詞，要求照抄。
- **比例：只有 9:16 或 16:9**，建立後鎖定，整個專案的分鏡圖與影片都用這個比例。
- 調性（選填，一句話）。

### ② 分鏡表

- 輸入區：上傳腳本圖（選填）＋文字框（選填），至少要有一項。
- 第一次送出，AI 回傳：
  1. 分鏡表：欄位為 鏡號、秒數、畫面、運鏡、音效、配樂、畫面文字、轉場。表格每格可直接編輯。
  2. 建議：條列幾點，說明調整了什麼或建議調整什麼。
- 對話框：使用者用自然語言要求修改（「s03 改成手拿面膜展示」），AI 回傳整張更新後的表與一句說明。手動編輯過的格子會一起送給 AI，作為最新版本。
- 規則（搬自 `storyboard` skill）：
  - 前 2 秒要有 hook，產品要清楚出現，最後一鏡停在產品（包裝大、正面、不動）。
  - 每鏡 3–10 秒（Omni 限制）；腳本要求更短的鏡頭照樣生 3–4 秒，後製再剪。
  - 鏡頭之間的光線、場景、人物保持一致。
  - 每鏡寫出音效；配樂預設「無」，使用者指定的鏡頭才寫配樂風格。
  - 「畫面文字」只記錄在表上，不畫進圖片或影片。
  - 輸出語言依介面語系（繁中／英文）。
- **確認分鏡表**（關卡 1）：AI 為每一鏡寫英文生圖 prompt（`imagePrompt`），然後進入 ③。

### ③ 分鏡圖

- 每鏡一張卡片，顯示鏡號、畫面描述、2 張候選圖。進入此步驟時，所有還沒有候選圖的鏡頭平行生成（併發上限 4）。
- 候選圖固定 **1K**，比例為專案比例，每次都帶產品圖。
- 生圖 prompt 規則搬自 `cli/image-prompts.ts` 的 `buildKeyframeInstruction`：不改產品與包裝、不加任何文字、標題或浮水印；有包裝文字時要求照抄。
- 每張候選圖可點選為選定圖，點擊可放大檢視。
- **重生**：可先修改英文 prompt，或補一句中文說明（例如「人物換成短髮」），由 AI 改寫 prompt 後重生 2 張。舊候選圖保留在卡片裡，可以繼續選。
- 有包裝的鏡頭（AI 在分鏡表標示）卡片上顯示提示：「請放大檢查包裝上的字」。
- **定稿尺寸**：1K / 2K / 4K，預設 1K。
  - 1K：直接使用選定的候選圖，不重出、不收費。
  - 2K / 4K：用相同 prompt＋選定圖作為參考重出一張，先顯示張數與預估費用，確認後執行。
- 每鏡都有選定圖（且定稿完成）才能進入 ④（關卡 2）。

### ④ 影片

- 頁面上方是專案層級設定：解析度（720p / 1080p / 4K，同單鏡模式）、音訊（**預設只有音效**，可改為音效＋背景音樂）。
- 每鏡一張卡片：
  - 定稿圖（起始畫面）。
  - 五個欄位（主體、場景、運鏡、光線、聲音），進入此步驟時 AI 依分鏡表與定稿圖一次填好全部鏡頭；沿用 `PromptEditor`，可改。
  - 秒數（4 / 6 / 8 / 10，預設取分鏡表秒數往上取最近的選項）。
  - 結束畫面：無 / 下一鏡的定稿圖 / 自行上傳。依分鏡表「轉場」欄預設（轉場寫明是接續、溶接等時預設「下一鏡」，硬切預設「無」）。
- **全部生成**（關卡 3）：先列出每鏡秒數、解析度、是否有結束畫面、總秒數與預估總額，確認後開始。併發上限 3。
- 每鏡可單獨：重生、延伸、下載（檔名 `<鏡號>-<短描述>.mp4`）、檢視實際送出的英文 prompt。

## 資料

一個專案存成 IndexedDB 一筆資料（物件存放庫 `projects`），圖片與影片以 Blob 存放。

```ts
interface StoryboardProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ratio: VideoRatio;                // 建立後鎖定
  tone: string;
  packagingText: string;
  productImages: StoredImage[];     // 1–2 張
  script: {
    sourceImage?: StoredImage;
    sourceText: string;
    chat: ChatMessage[];            // 對話紀錄
    suggestions: string[];          // 最新一次的建議
    confirmed: boolean;
  };
  shots: Shot[];
  finalSize: ImageSize;             // "1K" | "2K" | "4K"
  videoSettings: { resolution: VideoResolution; audioMode: AudioMode };
  step: 1 | 2 | 3 | 4;
}

interface Shot {
  id: string;                       // "s01"
  seconds: number;
  visual: string;
  camera: string;
  sound: string;
  music: string;                    // "無" 或風格
  onScreenText: string;
  transition: string;
  hasPackaging: boolean;
  imagePrompt: string;              // 英文
  candidates: StoredImage[];
  selected?: number;                // candidates 的 index
  finalImage?: StoredImage;
  stale: boolean;                   // 分鏡修改後，圖片過期
  fields?: PromptFields;
  duration?: VideoDuration;
  endFrame: { kind: "none" } | { kind: "next" } | { kind: "upload"; image: StoredImage };
  video?: {
    blob?: Blob;
    prompt: string;
    status: "idle" | "generating" | "completed" | "failed" | "interrupted";
    error?: string;
    sourceVideoUri?: string;        // 延伸用
    duration: number;
  };
}

interface StoredImage { blob: Blob; mimeType: string; width: number; height: number }
```

- 每次狀態變更寫回 IndexedDB（debounce 500ms）。
- 頁面載入時，`video.status === "generating"` 的鏡頭改成 `interrupted`，卡片顯示「生成中斷，請重生」。
- 專案清單顯示在頁面左側（行動版收成選單），可新建、開啟、刪除（刪除前確認）。

## 架構

```
app/storyboard/page.tsx              頁面骨架、步驟條、專案清單
components/storyboard/
  ProjectSetupStep.tsx               ①
  ScriptStep.tsx, ShotTable.tsx, ScriptChat.tsx   ②
  ShotImagesStep.tsx, ShotImageCard.tsx           ③
  ShotVideosStep.tsx, ShotVideoCard.tsx           ④
  BatchCostConfirm.tsx               關卡 3 的費用確認
hooks/
  useStoryboardProject.ts            載入／儲存專案、更新 shots
  useBatchJobs.ts                    併發控制的工作佇列（圖與影片共用）
lib/storyboard/
  storage.ts                         IndexedDB 存取（idb-keyval 或原生 API）
  pricing.ts                         圖片與影片費用計算
  shots.ts                           秒數取整、結束畫面預設、過期標示等純函式
lib/ai/
  storyboard-prompts.ts              ② 的提示詞（解析、修改、寫生圖 prompt、填欄位）
  image-prompts.ts                   搬自 cli/image-prompts.ts
services/
  imageService.ts                    Nano Banana 呼叫（一律在瀏覽器端）
  storyboardService.ts               ② 的 AI 呼叫（static / server 雙路徑，同 videoService）
```

### AI 呼叫

- **分鏡表（文字）**：沿用 `GeminiClient` 的 `generateJson`，新增方法 `parseScript`、`reviseScript`、`writeImagePrompts`、`fillShotFields`。走與 `videoService` 相同的 static / server 雙路徑，使用者的 key 優先。
- **生圖**：一律從瀏覽器用使用者的 key 直接呼叫 `@google/genai` 的 `generateContent`（模型 `gemini-nano-banana-2.1`，`responseModalities: ["IMAGE","TEXT"]`，`imageConfig: { aspectRatio, imageSize }`），取最後一張非 thought 的圖片。原因：2K / 4K 圖的 base64 有數 MB，經過伺服器來回只會變慢，而 key 本來就在使用者手上。需要 key 而沒有設定時，開啟 API key 設定視窗（同單鏡模式）。
- **生影片**：重用 `startVideoGeneration` / `checkVideoStatus` / `extendVideo` 與 `cropImageToRatio`。從 `useVideoGeneration` 抽出「單一工作」的執行函式（組 prompt → 送出 → 輪詢 → 回傳結果），單鏡模式與分鏡模式共用；單鏡模式的行為不變。
- 每一鏡送出時帶專案的 `audioMode`。

### 費用

`lib/storyboard/pricing.ts` 集中所有單價：

- 影片：沿用 `PriceEstimate` 的每秒 $0.10（720p），1080p / 4K 顯示「起」。實作時把常數移到 `pricing.ts`，`PriceEstimate` 改為 import。
- 圖片：1K / 2K / 4K 各一個單價常數，實作時依 Google 官方 Gemini API 定價頁面填入，並在程式註解附上來源與日期。

## 錯誤處理

- 每一鏡的生圖、生影片獨立；一鏡失敗不影響其他鏡，卡片顯示原因與「重試」。
- 錯誤訊息沿用單鏡模式的 `toDisplayError` 對應（配額、rate limit、金鑰、內容過濾），抽到共用模組。
- 生圖遇到安全過濾（沒有產出圖片）時顯示 `blockReason` / `finishReason` 的對應訊息。
- AI 回傳的分鏡表 JSON 解析失敗時重試一次，仍失敗則顯示錯誤，保留使用者的輸入與現有的表。
- 併發佇列遇到 429 時，該工作延遲後重試（最多 2 次），不連帶取消其他工作。

## 測試

專案目前沒有測試框架，新增 Vitest（只跑 Node 環境的純邏輯）：

- `lib/storyboard/shots.ts`：秒數取整、結束畫面預設、過期標示。
- `lib/storyboard/pricing.ts`：各尺寸、張數、秒數、解析度的總額。
- `lib/ai/storyboard-prompts.ts`：分鏡表 JSON 解析（正常、欄位缺漏、秒數超出範圍）。
- `lib/ai/image-prompts.ts`：prompt 組裝包含包裝文字與禁止加字的規則。
- `hooks/useBatchJobs.ts` 的佇列核心抽成純函式，測併發上限、失敗不影響其他工作、429 重試。

端到端：用 `20261013_PDRN黑面膜新上市/分鏡說明.jpg` 實際跑 ①–③（文字與生圖費用低）；④ 先用 mock provider（`VIDEO_PROVIDER=mock`）跑完批次流程，再由使用者決定是否真的花錢生一鏡。

## 待後續

- `campaign`（多提案）與 `product-shot`（產品照模式）重用本次的生圖服務與卡片元件。
- CLI 改為 import `lib/ai/image-prompts.ts`，兩邊共用一套規則。
- 粗剪（ffmpeg.wasm）視需要再評估。
