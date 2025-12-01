# I Not Moving Today

> Viral video? Making it myself? Nope. I'm not moving today.

An AI-powered video script generator for Reels/TikTok/Shorts/YouTube. Upload images, describe your idea, and let **AI** craft viral-worthy video scripts and generate videos with Google Veo 3.1.

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

### Phase 1: Image Analysis & Direction

_The Creative Spark_

- **Smart Image Analysis**: Upload up to 3 images, AI analyzes visual features, mood, colors, and themes
- **3 Video Directions**: Instantly generate 3 distinct video concepts
- **AI-Recommended Settings**: Automatic suggestions for consistency mode, motion dynamics, and quality booster
- **Platform-Specific Strategy**: Optimized hooks for TikTok/Reels/Shorts vs YouTube

### Phase 2: Script Generation & Video Creation

_Let AI Do The Work_

#### Multi-Platform Support

| Ratio           | Best For                              |
| --------------- | ------------------------------------- |
| **9:16**        | TikTok, Reels, Shorts (vertical)      |
| **16:9**        | YouTube, landscape videos             |
| **1:1**         | Instagram posts, square format        |

#### Video Generation Settings

| Setting              | Options                                                    |
| -------------------- | ---------------------------------------------------------- |
| **Consistency Mode** | None, Product, Character, Both                             |
| **Motion Dynamics**  | Subtle, Moderate, Dramatic                                 |
| **Quality Booster**  | Commercial, Cinematic, Luxury, Editorial, Documentary, Artistic |
| **Scene Mode**       | Auto, Single (≤8s), Multi (story-based)                    |
| **Resolution**       | 720p, 1080p                                                |

#### Image Usage

| Mode      | Description                                    |
| --------- | ---------------------------------------------- |
| **Start** | Use image as video opening (Image-to-Video)    |
| **None**  | Pure text-to-video generation                  |

### Video Generation

Powered by **Google Veo 3.1** for high-quality AI video generation.

- Up to 8 seconds per clip
- Image-to-Video support
- Multiple aspect ratios
- Fast or Standard quality modes

---

## Tech Stack

| Category  | Technology                                     |
| --------- | ---------------------------------------------- |
| Framework | Next.js 16 + React 19 + TypeScript             |
| AI Models | Google Gemini (text analysis)                  |
|           | Google Veo 3.1 (video generation)              |
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

# Gemini Thinking Budget (optional)
GEMINI_THINKING_BUDGET=2048

# Video Provider: mock (testing), veo (Google Veo 3.1)
VIDEO_PROVIDER=veo

# Veo Quality Mode (optional)
# false = Fast mode (default), true = Standard mode (higher quality)
VEO_USE_STANDARD=false
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

1. **Upload Images**: Add up to 3 reference images
2. **Describe Your Idea**: Tell AI what video you want
3. **AI Analysis**: Wait ~3-5 seconds for analysis
4. **Choose Direction**: Pick from 3 AI-generated concepts
5. **Configure Settings**: Adjust ratio, consistency, motion, quality
6. **Generate Script**: AI creates detailed scene-by-scene script
7. **Generate Video**: Powered by Google Veo 3.1
8. **Download & Share**: Export your viral video

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

一個由 AI 驅動的影片腳本生成工具，支援 Reels/TikTok/Shorts/YouTube。上傳圖片、描述你的想法，讓 **AI** 幫你打造爆款影片腳本，並使用 Google Veo 3.1 生成影片。

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

### 第一階段：圖片分析與方向選擇

_創意的火花_

- **智能圖片分析**：上傳最多 3 張圖片，AI 自動分析視覺特徵、氛圍、色彩與主題
- **三種影片方向**：即時生成 3 種截然不同的影片概念
- **AI 推薦設定**：自動建議一致性模式、動態程度與品質增強
- **平台專屬策略**：針對 TikTok/Reels/Shorts 與 YouTube 優化開場策略

### 第二階段：腳本生成與影片製作

_讓 AI 來努力_

#### 多平台支援

| 比例      | 適用場景                         |
| --------- | -------------------------------- |
| **9:16**  | TikTok、Reels、Shorts（直式）    |
| **16:9**  | YouTube、橫式影片                |
| **1:1**   | Instagram 貼文、方形格式         |

#### 影片生成設定

| 設定             | 選項                                                         |
| ---------------- | ------------------------------------------------------------ |
| **一致性模式**   | 無、產品、人物、兩者皆是                                     |
| **動態程度**     | 微妙、中等、劇烈                                             |
| **品質增強**     | 商業級、電影級、奢侈品、編輯級、紀錄片、藝術感               |
| **場景模式**     | 自動、單場景（≤8秒）、多場景（故事敘述）                     |
| **解析度**       | 720p、1080p                                                  |

#### 圖片使用方式

| 模式     | 說明                             |
| -------- | -------------------------------- |
| **開頭** | 使用圖片作為影片開頭（圖生影片） |
| **不用** | 純文字生成影片                   |

### 影片生成

由 **Google Veo 3.1** 驅動的高品質 AI 影片生成。

- 單次最長 8 秒
- 支援圖片轉影片
- 多種長寬比
- 快速或標準品質模式

---

## 技術棧

| 類別    | 技術                              |
| ------- | --------------------------------- |
| 框架    | Next.js 16 + React 19 + TypeScript |
| AI 模型 | Google Gemini（文字分析）         |
|         | Google Veo 3.1（影片生成）        |
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

# Gemini Thinking Budget（選填）
GEMINI_THINKING_BUDGET=2048

# 影片提供者：mock（測試用）、veo（Google Veo 3.1）
VIDEO_PROVIDER=veo

# Veo 品質模式（選填）
# false = 快速模式（預設）、true = 標準模式（更高品質）
VEO_USE_STANDARD=false
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

1. **上傳圖片**：新增最多 3 張參考圖片
2. **描述想法**：告訴 AI 你想要什麼影片
3. **AI 分析**：等待約 3-5 秒完成分析
4. **選擇方向**：從 3 個 AI 生成的概念中選擇
5. **調整設定**：設定比例、一致性、動態、品質
6. **生成腳本**：AI 建立詳細的分場腳本
7. **生成影片**：由 Google Veo 3.1 驅動
8. **下載分享**：匯出你的爆款影片

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
