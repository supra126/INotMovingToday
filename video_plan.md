# 短影片社群行銷應用開發規劃

> 生成日期：2025-11-28
> 參考專案：https://github.com/supra126/IGiveUpOnLife / IGiveUpOnLife（AI 行銷圖片生成器）
> 風格、樣式參考：https://github.com/supra126/IGiveUpOnLife

---

## 🎯 產品定位

**名稱**：`INotMovingToday (不想動了) (AI 行銷影片生成器)`

**目標**：讓用戶透過圖片 + 文字描述，經過 AI 引導式對話，最終生成 Reels/Shorts/TikTok 短影片

**核心概念**：迭代式引導生成 - 透過多輪對話逐步精煉影片方向

---

## 🔄 使用者流程設計

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 1: 初始輸入                          │
│  用戶上傳 1 張圖片 + 描述 → AI 分析 → 產出 3 種影片方向建議            │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 2: 迭代精煉（可重複）                     │
│  用戶選擇 1 個方向 + 可選調整意見                                    │
│  用戶可追加圖片（最多累計 3 張）+ 額外文字                            │
│  → AI 重新分析 → 產出新的 3 種方向建議                              │
│  （循環直到用戶滿意）                                               │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 3: 最終確認                            │
│  顯示完整影片規劃（腳本、分鏡、時長、配樂建議）                         │
│  用戶確認 → 開始生成影片                                           │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 4: 影片生成                            │
│  AI 生成影片 → 預覽 → 下載/分享                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 雙構建模式架構

### 構建模式對比

| 特性 | 伺服器版 | 靜態版 |
|------|---------|--------|
| **構建指令** | `pnpm build` | `pnpm build:static` |
| **輸出** | `.next/` (SSR) | `dist/` (Static Export) |
| **API 金鑰** | 伺服器端環境變數 | 用戶自行輸入 |
| **速率限制** | ✅ 支援（基於 IP） | ❌ 不支援 |
| **認證整合** | ✅ Cloudflare Zero Trust | ❌ 無 |
| **部署方式** | Docker / Railway / VPS | GitHub Pages / Cloudflare Pages / S3 |
| **適用場景** | 商業服務、團隊使用 | 個人使用、開源分享 |

### 架構設計

```
┌─────────────────────────────────────────────────────────────────┐
│                         應用層 (App Layer)                       │
│                                                                 │
│   app/page.tsx ←→ components/* ←→ contexts/*                   │
│                         ↓                                       │
│              services/videoService.ts (統一入口)                  │
│                         ↓                                       │
│         ┌───────────────┴───────────────┐                       │
│         ↓                               ↓                       │
│   [伺服器模式]                      [靜態模式]                    │
│   app/actions/*.ts                services/videoClient.ts       │
│   - Server Actions                - 純客戶端 API 調用             │
│   - 速率限制                       - 用戶提供 API Key             │
│   - 伺服器 API Key                 - 無伺服器依賴                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 服務層實現模式

```typescript
// services/videoService.ts - 統一服務入口

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

export async function analyzeImages(
  images: File[],
  description: string,
  apiKey?: string,
  locale?: Locale
): Promise<AnalysisResult> {
  if (isStaticBuild) {
    // 靜態版：使用客戶端直接調用
    const { analyzeImagesClient } = await import("./videoClient");
    return analyzeImagesClient(images, description, apiKey!, locale);
  } else {
    // 伺服器版：使用 Server Action
    const { analyzeImagesAction } = await import("@/app/actions/analyze");
    return analyzeImagesAction(images, description, locale);
  }
}

// 其他函數同理...
```

### Next.js 配置

```typescript
// next.config.ts

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

const nextConfig: NextConfig = {
  output: isStaticBuild ? "export" : undefined,

  images: {
    unoptimized: isStaticBuild,
  },

  experimental: {
    serverActions: isStaticBuild
      ? undefined
      : {
          bodySizeLimit: "20mb",
        },
  },

  // 靜態版不使用 trailing slash，保持 SPA 路由
  trailingSlash: false,
};

export default nextConfig;
```

### package.json 腳本

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "build:static": "NEXT_PUBLIC_BUILD_MODE=static next build",
    "start": "next start",
    "start:static": "node bin/cli.js",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

---

## 📁 專案結構

```
short-video-generator/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 首頁/上傳入口
│   ├── create/
│   │   └── page.tsx                # 主創作流程頁面（單頁多階段）
│   ├── preview/
│   │   └── [id]/page.tsx           # 影片預覽頁
│   └── actions/                    # Server Actions（伺服器版專用）
│       ├── analyze.ts              # 圖片分析
│       ├── refine.ts               # 迭代精煉
│       ├── script.ts               # 腳本生成
│       └── generate.ts             # 影片生成
│
├── components/
│   ├── upload/
│   │   ├── ImageUploader.tsx       # 圖片上傳（支援拖放、多張）
│   │   ├── ImagePreview.tsx        # 已上傳圖片預覽
│   │   └── ImageGallery.tsx        # 多圖管理畫廊
│   ├── suggestions/
│   │   ├── SuggestionCard.tsx      # 單一建議卡片
│   │   ├── SuggestionList.tsx      # 3 個建議的容器
│   │   └── AdjustmentInput.tsx     # 調整方向輸入框
│   ├── timeline/
│   │   ├── ProgressIndicator.tsx   # 階段進度指示器
│   │   └── IterationHistory.tsx    # 迭代歷史記錄
│   ├── preview/
│   │   ├── ScriptPreview.tsx       # 腳本預覽
│   │   ├── StoryboardPreview.tsx   # 分鏡預覽
│   │   └── VideoPlayer.tsx         # 影片播放器
│   ├── settings/
│   │   └── ApiKeyModal.tsx         # API 金鑰設定（靜態版用）
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Spinner.tsx
│       └── LanguageToggle.tsx
│
├── services/
│   ├── videoService.ts             # 統一服務入口（自動切換模式）
│   ├── videoClient.ts              # 客戶端 API（靜態版）
│   └── video-providers/
│       ├── veo.ts                  # Google VEO 3.1 (Gemini API)
│       ├── runway.ts               # Runway ML API
│       ├── pika.ts                 # Pika Labs API
│       └── kling.ts                # 可靈 API
│
├── lib/
│   ├── ai/
│   │   ├── prompts.ts              # AI Prompt 模板
│   │   └── gemini-client.ts        # Gemini API 封裝
│   ├── storage/
│   │   ├── api-key-storage.ts      # API 金鑰存儲（sessionStorage）
│   │   └── session-store.ts        # 創作會話狀態管理
│   ├── rate-limit.ts               # 速率限制（伺服器版）
│   ├── cloudflareAccess.ts         # Cloudflare Zero Trust
│   └── utils/
│       ├── image-utils.ts          # 圖片處理工具
│       └── validation.ts           # 輸入驗證
│
├── types/
│   └── index.ts                    # 所有 TypeScript 類型定義
│
├── contexts/
│   ├── CreationContext.tsx         # 創作流程狀態 Context
│   └── LocaleContext.tsx           # 國際化
│
├── locales/
│   ├── zh.json                     # 繁體中文
│   └── en.json                     # 英文
│
├── hooks/
│   ├── useCreationFlow.ts          # 創作流程 hook
│   ├── useImageUpload.ts           # 圖片上傳 hook
│   └── useVideoGeneration.ts       # 影片生成 hook
│
├── bin/
│   └── cli.js                      # NPM CLI 入口（靜態版）
│
├── .github/
│   └── workflows/
│       ├── docker-publish.yml      # Docker 構建和推送
│       └── npm-publish.yml         # NPM 發布（靜態版）
│
├── Dockerfile                      # 多階段 Docker 構建
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
└── README.md
```

---

## 📊 核心資料結構

```typescript
// types/index.ts

// ============ 基礎類型 ============

type VideoRatio = '9:16' | '16:9' | '1:1';

type VideoPlatform = 'reels' | 'shorts' | 'tiktok';

type VideoStyle =
  | 'cinematic'      // 電影感
  | 'dynamic'        // 動感剪輯
  | 'storytelling'   // 敘事型
  | 'product-demo'   // 產品展示
  | 'tutorial'       // 教學型
  | 'aesthetic'      // 美感氛圍
  | 'meme';          // 迷因/趣味

type Locale = 'zh' | 'en';

// ============ 上傳的素材 ============

interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  uploadedAt: number;
  order: number;
}

interface UserInput {
  images: UploadedImage[];           // 最多 3 張
  description: string;
  additionalNotes?: string;
}

// ============ AI 分析結果 ============

interface ImageAnalysis {
  subjects: string[];
  mood: string;
  colors: string[];
  setting: string;
  suggestedThemes: string[];
}

// ============ 影片方向建議 ============

interface VideoSuggestion {
  id: string;
  title: string;                     // 簡短標題（5-10字）
  concept: string;                   // 概念描述（50-100字）
  style: VideoStyle;
  targetPlatform: VideoPlatform;
  estimatedDuration: number;         // 秒數（15/30/60）

  // 初步規劃
  hookIdea: string;                  // 開頭吸睛點
  mainContent: string;               // 主要內容描述
  callToAction: string;              // 結尾行動呼籲

  // 視覺建議
  visualStyle: string;
  transitionStyle: string;
  suggestedMusic: string;
}

interface SuggestionSet {
  id: string;
  iterationNumber: number;
  timestamp: number;
  suggestions: [VideoSuggestion, VideoSuggestion, VideoSuggestion];
  basedOn: {
    images: string[];
    userInputs: string[];
    previousSelection?: string;
  };
}

// ============ 用戶選擇與調整 ============

interface UserSelection {
  suggestionId: string;
  adjustment?: string;
  additionalImages?: UploadedImage[];
  additionalText?: string;
}

// ============ 迭代歷史 ============

interface IterationRecord {
  round: number;
  suggestionSet: SuggestionSet;
  userSelection: UserSelection;
}

// ============ 最終影片規劃 ============

interface SceneScript {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  description: string;
  visualPrompt: string;
  textOverlay?: string;
  transition: string;
}

interface VideoScript {
  scenes: SceneScript[];
  totalDuration: number;
  voiceoverText?: string;
}

interface FinalVideoSpec {
  id: string;
  title: string;
  ratio: VideoRatio;
  duration: number;
  style: VideoStyle;
  script: VideoScript;
  musicStyle: string;
  colorGrading: string;

  // 來源追溯
  sourceImages: UploadedImage[];
  iterationHistory: IterationRecord[];
}

// ============ 創作會話狀態 ============

type CreationPhase =
  | 'initial-upload'
  | 'first-suggestions'
  | 'refining'
  | 'final-review'
  | 'generating'
  | 'completed';

interface CreationSession {
  id: string;
  phase: CreationPhase;
  startedAt: number;

  images: UploadedImage[];
  iterations: IterationRecord[];
  currentSuggestions?: SuggestionSet;

  finalSpec?: FinalVideoSpec;
  generatedVideoUrl?: string;
}

// ============ API 回應類型 ============

interface AnalysisResponse {
  imageAnalysis: ImageAnalysis;
  suggestions: [VideoSuggestion, VideoSuggestion, VideoSuggestion];
}

interface ScriptResponse {
  script: VideoScript;
  musicRecommendation: {
    style: string;
    tempo: string;
    mood: string;
  };
  colorGrading: string;
}

interface GenerationResponse {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
}
```

---

## 🧠 AI Prompt 設計

### Phase 1: 初始分析 Prompt

```typescript
// lib/ai/prompts.ts

export const INITIAL_ANALYSIS_PROMPT = `
你是一位專業的短影片內容策劃師，擅長製作 Reels、Shorts、TikTok 爆款內容。

## 任務
分析用戶提供的圖片和描述，提出 3 種不同方向的短影片創意建議。

## 輸入
- 圖片：{imageCount} 張
- 用戶描述：{userDescription}

## 輸出要求
提供 3 種 **差異化明顯** 的影片方向：
1. **安全牌**：最直覺、最符合用戶描述的方向
2. **創意牌**：有創意轉折或意外角度的方向
3. **爆款牌**：參考當前平台熱門趨勢的方向

每個方向需包含：
- title: 簡短吸睛的標題（5-10字）
- concept: 影片概念描述（50-80字）
- style: 影片風格（cinematic/dynamic/storytelling/product-demo/tutorial/aesthetic/meme）
- targetPlatform: 最適合的平台（reels/shorts/tiktok）
- estimatedDuration: 建議時長（15/30/60秒）
- hookIdea: 前3秒的吸睛設計
- mainContent: 主要內容規劃
- callToAction: 結尾設計
- visualStyle: 視覺風格描述
- transitionStyle: 轉場建議
- suggestedMusic: 配樂風格

## 回應格式
以 JSON 格式回應：
{
  "imageAnalysis": {
    "subjects": [],
    "mood": "",
    "colors": [],
    "setting": "",
    "suggestedThemes": []
  },
  "suggestions": [
    { ... },
    { ... },
    { ... }
  ]
}
`;

export const INITIAL_ANALYSIS_PROMPT_EN = `
You are a professional short-form video content strategist, expert in creating viral Reels, Shorts, and TikTok content.

## Task
Analyze the user's provided images and description, then propose 3 different short video creative directions.

## Input
- Images: {imageCount}
- User description: {userDescription}

## Output Requirements
Provide 3 **distinctly different** video directions:
1. **Safe Choice**: Most intuitive, closely matching the user's description
2. **Creative Choice**: Unexpected angle or creative twist
3. **Viral Choice**: Following current platform trends

Each direction must include:
- title: Short catchy title (5-10 words)
- concept: Video concept description (50-80 words)
- style: Video style
- targetPlatform: Best suited platform
- estimatedDuration: Suggested duration (15/30/60 seconds)
- hookIdea: First 3 seconds hook design
- mainContent: Main content plan
- callToAction: Ending design
- visualStyle: Visual style description
- transitionStyle: Transition suggestions
- suggestedMusic: Music style

## Response Format
Respond in JSON format.
`;
```

### Phase 2: 迭代精煉 Prompt

```typescript
export const REFINEMENT_PROMPT = `
你是一位專業的短影片內容策劃師。

## 背景
用戶正在進行第 {iterationNumber} 輪的創意精煉。

### 之前的選擇
用戶在上一輪選擇了：「{previousSelection.title}」
概念：{previousSelection.concept}

### 用戶的調整意見
{userAdjustment}

### 新增素材
- 新增圖片：{newImageCount} 張
- 額外說明：{additionalText}

### 所有可用圖片
共 {totalImageCount} 張圖片

## 任務
根據用戶的選擇和調整意見，提出 3 種 **精煉後** 的影片方向：
1. **延續優化**：保留原選擇核心，優化細節
2. **方向微調**：根據調整意見做出明確改變
3. **大膽突破**：結合新素材，嘗試新可能

## 回應格式
同初始分析格式，以 JSON 回應。
`;

export const REFINEMENT_PROMPT_EN = `
You are a professional short-form video content strategist.

## Background
User is on iteration round {iterationNumber} of creative refinement.

### Previous Selection
User selected: "{previousSelection.title}"
Concept: {previousSelection.concept}

### User's Adjustment Request
{userAdjustment}

### New Materials
- New images: {newImageCount}
- Additional notes: {additionalText}

### All Available Images
Total: {totalImageCount} images

## Task
Based on user's selection and adjustment requests, propose 3 **refined** video directions:
1. **Continue & Optimize**: Keep core concept, optimize details
2. **Adjust Direction**: Make clear changes based on feedback
3. **Bold Breakthrough**: Try new possibilities with new materials

## Response Format
Same as initial analysis, respond in JSON.
`;
```

### Phase 3: 腳本生成 Prompt

```typescript
export const FINAL_SCRIPT_PROMPT = `
你是一位專業的短影片腳本編劇和分鏡師。

## 任務
根據最終確認的影片方向，生成完整的影片腳本和分鏡規劃。

### 影片規格
- 標題：{title}
- 概念：{concept}
- 風格：{style}
- 時長：{duration} 秒
- 比例：{ratio}

### 素材
- 可用圖片：{imageCount} 張
- 圖片描述：{imageDescriptions}

## 輸出要求
生成分場腳本，每場包含：
- 時間碼（開始-結束）
- 場景描述
- 畫面上的文字（如有）
- 視覺效果/轉場
- AI 影片生成用的詳細視覺提示詞（英文，具體描述畫面動態）

## 回應格式
{
  "script": {
    "scenes": [
      {
        "sceneNumber": 1,
        "startTime": 0,
        "endTime": 3,
        "duration": 3,
        "description": "場景描述",
        "visualPrompt": "Detailed English prompt for AI video generation...",
        "textOverlay": "畫面文字",
        "transition": "轉場效果"
      }
    ],
    "totalDuration": 30,
    "voiceoverText": "旁白文字（如需要）"
  },
  "musicRecommendation": {
    "style": "音樂風格",
    "tempo": "節奏（BPM 範圍）",
    "mood": "情緒"
  },
  "colorGrading": "調色風格建議"
}
`;

export const FINAL_SCRIPT_PROMPT_EN = `
You are a professional short-form video scriptwriter and storyboard artist.

## Task
Based on the finalized video direction, generate a complete script and storyboard plan.

### Video Specifications
- Title: {title}
- Concept: {concept}
- Style: {style}
- Duration: {duration} seconds
- Ratio: {ratio}

### Materials
- Available images: {imageCount}
- Image descriptions: {imageDescriptions}

## Output Requirements
Generate scene-by-scene script, each scene includes:
- Timecode (start-end)
- Scene description
- Text overlay (if any)
- Visual effects/transitions
- Detailed visual prompt for AI video generation (specific motion description)

## Response Format
Same JSON structure as Chinese version.
`;
```

---

## 🎬 影片生成 API 整合

### 支援的服務

| 服務 | 優點 | 缺點 | 價格參考 |
|------|------|------|---------|
| **Runway Gen-3** | 品質最高、控制力強 | 價格較高 | ~$0.05/秒 |
| **Pika Labs** | 性價比高、速度快 | 一致性稍差 | ~$0.02/秒 |
| **可靈 (Kling)** | 中文優化、價格實惠 | 海外訪問不穩定 | ~¥0.1/秒 |
| **Luma Dream Machine** | 動態效果好 | API 較新 | ~$0.03/秒 |

### 可插拔架構設計

```typescript
// services/video-providers/types.ts

interface VideoGenerationProvider {
  name: string;
  generateVideo(params: GenerationParams): Promise<GenerationResult>;
  checkStatus(jobId: string): Promise<JobStatus>;
  getCapabilities(): ProviderCapabilities;
}

interface GenerationParams {
  prompt: string;
  duration: number;
  ratio: VideoRatio;
  referenceImages?: string[];  // base64 或 URL
  style?: string;
}

interface GenerationResult {
  jobId: string;
  estimatedTime: number;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}
```

```typescript
// services/video-providers/runway.ts

import { VideoGenerationProvider } from './types';

export class RunwayProvider implements VideoGenerationProvider {
  name = 'Runway Gen-3';

  async generateVideo(params: GenerationParams): Promise<GenerationResult> {
    // Runway API 實現
  }

  async checkStatus(jobId: string): Promise<JobStatus> {
    // 狀態查詢
  }

  getCapabilities() {
    return {
      maxDuration: 10,  // 秒
      supportedRatios: ['16:9', '9:16', '1:1'],
      supportsReferenceImage: true,
      supportsTextOverlay: false,
    };
  }
}
```

---

## 🔐 環境變數配置

### .env.example

```bash
# ============ AI 模型配置 ============
GEMINI_API_KEY=                          # 伺服器端 API 金鑰（可選）
GEMINI_TEXT_MODEL=gemini-2.5-flash       # 文字分析模型
GEMINI_THINKING_BUDGET=2048              # 思考預算（0-24000）

# ============ 影片生成 API ============
VIDEO_PROVIDER=runway                     # runway / pika / kling / luma
RUNWAY_API_KEY=                          # Runway API 金鑰
PIKA_API_KEY=                            # Pika Labs API 金鑰
KLING_API_KEY=                           # 可靈 API 金鑰

# ============ 速率限制（伺服器版）============
RATE_LIMIT_WINDOW_MS=60000               # 時間窗口（毫秒）
RATE_LIMIT_MAX_REQUESTS=5                # 最大請求數（影片生成較貴，建議較低）
RATE_LIMIT_ENABLED=true

# ============ Cloudflare Zero Trust（可選）============
CF_ACCESS_TEAM_NAME=
CF_ACCESS_AUD=

# ============ 構建模式 ============
# NEXT_PUBLIC_BUILD_MODE=static          # 靜態構建時取消註解
```

---

## 🛠️ 技術選型

| 層面 | 選擇 | 理由 |
|------|------|------|
| **框架** | Next.js 15+ (App Router) | Server Actions、雙構建模式支援 |
| **語言** | TypeScript 5.x | 類型安全 |
| **樣式** | Tailwind CSS 4 | 快速開發、一致性 |
| **狀態管理** | Zustand | 輕量、簡單、支援持久化 |
| **AI 分析** | Gemini 2.5 Flash | 多圖支援、速度快、價格合理 |
| **影片生成** | Runway Gen-3 (主) | 品質最佳，可擴展其他服務 |
| **動畫** | Framer Motion | 流程過渡動畫 |
| **圖片上傳** | 本地處理 + base64 | 簡單，無需額外服務 |

---

## 📅 開發階段規劃

### 階段一：核心流程 MVP
- [ ] 專案初始化（Next.js + Tailwind + TypeScript）
- [ ] 雙構建模式配置（next.config.ts）
- [ ] 基礎類型定義（types/index.ts）
- [ ] 圖片上傳組件（單張）
- [ ] Gemini 分析整合（伺服器版 + 客戶端版）
- [ ] 3 個建議卡片 UI
- [ ] 選擇 + 調整輸入
- [ ] 單次流程完成

### 階段二：完整迭代功能
- [ ] 多圖上傳（最多 3 張）
- [ ] 圖片管理畫廊
- [ ] 迭代精煉邏輯
- [ ] 迭代歷史記錄 UI
- [ ] 進度指示器
- [ ] 會話狀態持久化（Zustand + localStorage）

### 階段三：影片規劃與預覽
- [ ] 最終確認頁面
- [ ] 腳本生成 API
- [ ] 分鏡預覽組件
- [ ] 腳本編輯功能

### 階段四：影片生成整合
- [ ] Runway API 整合
- [ ] 生成進度輪詢
- [ ] 影片播放器
- [ ] 下載功能
- [ ] 錯誤處理與重試

### 階段五：部署與發布
- [ ] Docker 配置
- [ ] GitHub Actions CI/CD
- [ ] NPM CLI 工具（靜態版）
- [ ] README 文檔

### 階段六：優化與擴展
- [ ] 多語言支援（繁中/英文）
- [ ] API 金鑰管理 Modal
- [ ] 速率限制
- [ ] Cloudflare Zero Trust 整合
- [ ] 其他影片生成服務（Pika、可靈）

---

## ⚠️ 關鍵挑戰與解決方案

### 1. 影片生成成本高
**問題**：影片生成 API 價格昂貴，容易被濫用

**解決方案**：
- 先生成預覽圖/關鍵幀，確認後再生成完整影片
- 伺服器版實施嚴格速率限制
- 考慮 credits 系統
- 靜態版用戶自備 API Key，成本自負

### 2. 迭代狀態管理複雜
**問題**：多輪迭代的狀態追蹤

**解決方案**：
- 使用 Zustand 管理全局狀態
- localStorage 持久化，頁面刷新不丟失
- 清晰的狀態機設計（CreationPhase）

### 3. 多圖分析一致性
**問題**：多張圖片需要整體分析，而非分開處理

**解決方案**：
- 單次 API 調用傳入所有圖片
- Gemini 支援多圖輸入，讓 AI 整體理解

### 4. 影片生成時間長
**問題**：生成可能需要幾分鐘

**解決方案**：
- 實施進度輪詢機制
- 顯示預估時間
- 支援背景生成（生成完成後通知）

---

## 🔗 與 IGiveUpOnLife 的對比

| 面向 | IGiveUpOnLife（圖片） | 新專案（影片） |
|------|---------------------|---------------|
| 輸出 | 靜態圖片 | 動態影片 |
| 流程 | 2 階段線性 | 多輪迭代 |
| 素材 | 單張圖片 | 多張圖片累積（最多 3 張） |
| AI 調用 | 分析 + 圖片生成 | 分析 + 迭代 + 腳本 + 影片生成 |
| 狀態複雜度 | 簡單 | 複雜（需持久化會話） |
| 生成成本 | 較低 | 較高（影片 API 貴） |
| 生成時間 | 秒級 | 分鐘級 |

---

## 📚 參考資源

- [Next.js App Router 文檔](https://nextjs.org/docs/app)
- [Gemini API 文檔](https://ai.google.dev/docs)
- [Runway API 文檔](https://docs.runwayml.com/)
- [Zustand 文檔](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)

---

---

# 🚀 開始開發 Prompt

將以下內容複製到新專案的 Claude Code 對話中，開始開發：

```
我要開發一個 AI 短影片社群行銷應用，讓用戶透過圖片和文字描述，經過多輪 AI 引導式對話，最終生成 Reels/Shorts/TikTok 短影片。

## 核心流程
1. **Phase 1 - 初始輸入**：用戶上傳 1 張圖片 + 描述 → AI 分析 → 產出 3 種影片方向建議
2. **Phase 2 - 迭代精煉**（可重複）：用戶選擇 1 個方向 + 調整意見 + 可追加圖片（最多累計 3 張）→ AI 重新分析 → 產出新的 3 種方向
3. **Phase 3 - 最終確認**：顯示完整影片規劃（腳本、分鏡、時長、配樂）→ 用戶確認
4. **Phase 4 - 影片生成**：AI 生成影片 → 預覽 → 下載

## 技術需求
- **框架**：Next.js 15+ (App Router) + TypeScript + Tailwind CSS 4
- **AI**：Google Gemini API（分析用 gemini-2.5-flash）
- **影片生成**：Runway Gen-3 API（可插拔架構，預留其他服務）
- **狀態管理**：Zustand + localStorage 持久化
- **雙構建模式**：
  - 伺服器版（`pnpm build`）：Server Actions、速率限制、伺服器 API Key
  - 靜態版（`pnpm build:static`）：純客戶端、用戶自備 API Key、可部署到 GitHub Pages

## 關鍵設計
- 服務層統一入口，自動切換伺服器/靜態模式
- 迭代歷史記錄，可回溯查看
- 多圖管理畫廊
- 進度指示器顯示當前階段
- 影片生成進度輪詢

## 參考
完整規劃文檔位於：.scripts/video_plan.md
包含詳細的專案結構、類型定義、AI Prompt 模板、環境變數配置等。

請先閱讀規劃文檔，然後從階段一（核心流程 MVP）開始開發。
```

---

*文檔結束*
