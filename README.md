# I Not Moving Today

> Viral video? Making it myself? Nope. I'm not moving today.

An AI-powered video script generator for Reels/TikTok/Shorts/YouTube. Upload images, describe your idea, and let **AI** craft viral-worthy video scripts and generate videos with Google Gemini Omni Flash.

---

## Try it now

### Online Demo

No setup needed. Just open and use.

**[inotmoving.simoko.com](https://inotmoving.simoko.com)**

### Local Setup

```bash
npx inotmovingtoday
```

> One command to launch
>
> Options: `--port 8080` `--lang en`

### Docker

```bash
docker run -p 8080:8080 supra126/inotmovingtoday

# With API Key (optional)
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key supra126/inotmovingtoday
```

> Open http://localhost:8080

---

## Features

### Step 1: Main Image + Idea

_The Creative Spark_

- **Main image**: Upload 1 image to animate it, 2-3 to combine them into a new shot, or none for text-to-video
- **One-sentence idea**: Describe what you want; AI analyzes the image's subject, mood and colors
- **Aspect ratio**: 9:16 or 16:9, detected from the image
- **Advanced (optional, collapsed)**: Resolution (720p / 1080p / 4K), length (4 / 6 / 8 / 10 s), things to avoid, end frame for a first-to-last-frame transition

No camera, motion or quality settings: Omni works them out from the image and the description.

### Step 2: Pick a Direction, Generate

_Let AI Do The Work_

- **3 Video Directions**: Distinct concepts with hook, content, call to action and visual description
- **Editable cards**: Tweak any field, or ask AI to adjust
- **One click**: The script is written in Omni-friendly natural language and sent straight to generation

### Video Generation

Powered by **Google Gemini Omni Flash** (`gemini-omni-1.1-flash`).

- 3-10 seconds per clip, with native audio
- Image-to-video, reference images, first/last frame
- Longer videos are extended in segments, up to 40 seconds
- Extend a finished video with "what happens next"

---

## Tech Stack

| Category  | Technology                                     |
| --------- | ---------------------------------------------- |
| Framework | Next.js 16 + React 19 + TypeScript             |
| AI Models | Gemini 3.8 Flash (analysis & scripts)          |
|           | Gemini Omni Flash (video generation)           |
| Styling   | Tailwind CSS                                   |
| State     | Zustand                                        |

---

## Installation

### Requirements

- Node.js 18+
- pnpm (recommended) or npm

### Quick Start

```bash
# Clone the repo
git clone https://github.com/supra126/INotMovingToday.git
cd INotMovingToday

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start dev server
pnpm dev
```

### Build & Deploy

```bash
# Server version (requires Node.js server)
pnpm build
pnpm start

# Static version (GitHub Pages, Cloudflare Pages, etc.)
pnpm build:static
pnpm start:static  # Local test
# Output: ./dist
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Gemini API Key (optional - if set, users get free access)
GEMINI_API_KEY=your-api-key

# Gemini thinking level (optional): low | medium | high
# GEMINI_THINKING_LEVEL=medium

# Video Provider: mock (testing), omni (Google Gemini Omni Flash)
VIDEO_PROVIDER=omni
```

> **Get Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

### Server vs Static Build

| Feature       | Server                | Static             |
| ------------- | --------------------- | ------------------ |
| API Key       | Server-side supported | User must provide  |
| Rate Limiting | Server-controlled     | None               |
| Deployment    | Node.js server        | Any static hosting |
| Output        | `.next/`              | `dist/`            |

---

## User Flow

1. **Upload a Main Image**: Optional, up to 3 images
2. **Describe Your Idea**: One sentence about the video
3. **AI Analysis**: AI proposes 3 directions
4. **Pick a Direction**: Edit it if you like, then generate
5. **Generate Video**: Script and video are produced automatically by Gemini Omni Flash
6. **Extend & Download**: Add more seconds or export the MP4

---

## Why This Exists

### User Experience

- Zero video editing skills needed
- Fast AI analysis (~3 seconds)
- Intuitive interface with smooth animations
- Full control over AI-generated content

### Content Creation

- Platform-optimized hooks (TikTok vs YouTube)
- Multiple video styles (cinematic, dynamic, storytelling, etc.)
- AI-recommended settings based on your images
- Scene-by-scene script generation

### Technical Advantages

- Cost-optimized - only generate what's needed
- Flexible deployment - server or static
- Modern stack - Next.js 16, React 19, TypeScript

---

## Contributing

Don't want to work alone? Neither do we.

- **Found a bug?** [Open an issue](https://github.com/supra126/INotMovingToday/issues)
- **Feature idea?** Let's discuss
- **Want to code?** PRs welcome

> _"I'm not moving today, but I'll review your PR."_ — The Maintainers

---

## Authors

| <a href="https://github.com/mag477"><img src="https://github.com/mag477.png" width="80" alt="mag477"/><br/><sub>@mag477</sub></a> | <a href="https://github.com/supra126"><img src="https://github.com/supra126.png" width="80" alt="supra126"/><br/><sub>@supra126</sub></a> |
| :-------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------: |

---

## License

MIT License

---

<p align="center">
  <i>Built with coffee and the desire to never move again.</i>
</p>

---

# 今天不想動

> 做病毒式短影片？自己剪？不用，今天不想動。

一個由 AI 驅動的影片腳本生成工具，支援 Reels/TikTok/Shorts/YouTube。上傳圖片、描述你的想法，讓 **AI** 幫你打造爆款影片腳本，並使用 Google Gemini Omni Flash 生成影片。

---

## 立即試用

### 線上試用

免安裝，打開即用。

**[inotmoving.simoko.com](https://inotmoving.simoko.com)**

### 本地試用

```bash
npx inotmovingtoday
```

> 一行指令啟動
>
> 選項: `--port 8080` `--lang zh`

### Docker

```bash
docker run -p 8080:8080 supra126/inotmovingtoday

# 帶 API Key（可選）
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key supra126/inotmovingtoday
```

> 開啟 http://localhost:8080

---

## 功能特色

### 第一步：主圖＋想法

_創意火花_

- **主圖**：上傳 1 張讓它動起來，2-3 張組合成新畫面，不上傳就用文字生成
- **一句話描述**：說出你想要的影片，AI 會分析圖片的主體、氛圍與色彩
- **畫面比例**：9:16 或 16:9，依主圖自動判斷
- **進階設定（選填，預設收起）**：解析度（720p / 1080p / 4K）、秒數（4 / 6 / 8 / 10）、排除內容、結束畫面（首尾幀轉場）

不需要設定運鏡、動態或品質：Omni 會依圖片和描述自動處理。

### 第二步：挑方向、直接生成

_讓 AI 做事_

- **3 個影片方向**：各自包含開場、內容、行動呼籲與視覺描述
- **卡片可編輯**：直接修改任何欄位，或請 AI 重新調整
- **一鍵生成**：腳本以 Omni 偏好的自然語言撰寫，完成後直接送出生成

### 影片生成

由 **Google Gemini Omni Flash**（`gemini-omni-1.1-flash`）驅動。

- 單段 3-10 秒，內建音效
- 支援圖生影片、參考圖、首尾幀
- 較長影片自動分段延伸，最長 40 秒
- 完成後可描述「接下來發生什麼」延伸影片

---

## 技術棧

| 類別    | 技術                              |
| ------- | --------------------------------- |
| 框架    | Next.js 16 + React 19 + TypeScript |
| AI 模型 | Gemini 3.8 Flash（分析與腳本）    |
|         | Gemini Omni Flash（影片生成）     |
| 樣式    | Tailwind CSS                      |
| 狀態    | Zustand                           |

---

## 安裝

### 環境要求

- Node.js 18+
- pnpm（推薦）或 npm

### 快速開始

```bash
# 克隆專案
git clone https://github.com/supra126/INotMovingToday.git
cd INotMovingToday

# 安裝依賴
pnpm install

# 複製環境變數
cp .env.example .env.local

# 啟動開發伺服器
pnpm dev
```

### 建置與部署

```bash
# 伺服器版（需要 Node.js 伺服器）
pnpm build
pnpm start

# 靜態版（可部署到 GitHub Pages、Cloudflare Pages 等）
pnpm build:static
pnpm start:static  # 本地測試
# 輸出目錄: ./dist
```

### 環境變數設定

複製 `.env.example` 為 `.env.local`：

```bash
# Gemini API 金鑰（選填 - 若設定，用戶可免費使用）
GEMINI_API_KEY=your-api-key

# Gemini 思考等級（選填）：low | medium | high
# GEMINI_THINKING_LEVEL=medium

# 影片提供者：mock（測試用）、omni（Google Gemini Omni Flash）
VIDEO_PROVIDER=omni
```

> **取得 API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 伺服器版 vs 靜態版

| 功能       | 伺服器版       | 靜態版       |
| ---------- | -------------- | ------------ |
| API 金鑰   | 支援伺服器端   | 用戶必須提供 |
| 速率限制   | 伺服器控制     | 無           |
| 部署方式   | Node.js 伺服器 | 任何靜態託管 |
| 輸出目錄   | `.next/`       | `dist/`      |

---

## 使用流程

1. **上傳主圖**：選填，最多 3 張
2. **描述想法**：一句話說明影片內容
3. **AI 分析**：AI 提出 3 個方向
4. **挑選方向**：可先修改，再按生成
5. **生成影片**：腳本與影片由 Gemini Omni Flash 自動完成
6. **延伸與下載**：再加幾秒或直接下載 MP4

---

## 為什麼做這個

### 使用者體驗

- 零影片剪輯技能要求
- 快速 AI 分析（約 3 秒）
- 直覺介面搭配流暢動畫
- AI 生成內容完全可控

### 內容創作

- 平台優化開場（TikTok vs YouTube）
- 多種影片風格（電影感、動感、敘事等）
- 根據圖片自動推薦設定
- 分場分鏡腳本生成

### 技術優勢

- 成本優化 - 只生成需要的內容
- 彈性部署 - 伺服器或靜態皆可
- 現代技術棧 - Next.js 16、React 19、TypeScript

---

## 一起來努力（？）

不想一個人努力？我們也是。

- **發現 Bug？** [開一個 Issue](https://github.com/supra126/INotMovingToday/issues)
- **功能建議？** 來討論看看
- **想寫程式？** 歡迎 PR

> _「今天不想動，但我會 review 你的 PR。」_ — 維護者們

---

## 作者

| <a href="https://github.com/mag477"><img src="https://github.com/mag477.png" width="80" alt="mag477"/><br/><sub>@mag477</sub></a> | <a href="https://github.com/supra126"><img src="https://github.com/supra126.png" width="80" alt="supra126"/><br/><sub>@supra126</sub></a> |
| :-------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------: |

---

## 授權

MIT License

---

<p align="center">
  <i>用咖啡和「今天不想動」的心情打造。</i>
</p>
