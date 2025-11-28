import type { Locale, VideoSuggestion } from "@/types";

// ============ Phase 1: Initial Analysis ============

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
以 JSON 格式回應（不要包含 markdown code block）：
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
- style: Video style (cinematic/dynamic/storytelling/product-demo/tutorial/aesthetic/meme)
- targetPlatform: Best suited platform (reels/shorts/tiktok)
- estimatedDuration: Suggested duration (15/30/60 seconds)
- hookIdea: First 3 seconds hook design
- mainContent: Main content plan
- callToAction: Ending design
- visualStyle: Visual style description
- transitionStyle: Transition suggestions
- suggestedMusic: Music style

## Response Format
Respond in JSON format (without markdown code block):
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

// ============ Phase 2: Refinement ============

export const REFINEMENT_PROMPT = `
你是一位專業的短影片內容策劃師。

## 背景
用戶正在進行第 {iterationNumber} 輪的創意精煉。

### 之前的選擇
用戶在上一輪選擇了：「{previousSelectionTitle}」
概念：{previousSelectionConcept}

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
同初始分析格式，以 JSON 回應（不要包含 markdown code block）。
`;

export const REFINEMENT_PROMPT_EN = `
You are a professional short-form video content strategist.

## Background
User is on iteration round {iterationNumber} of creative refinement.

### Previous Selection
User selected: "{previousSelectionTitle}"
Concept: {previousSelectionConcept}

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
Same as initial analysis, respond in JSON (without markdown code block).
`;

// ============ Phase 3: Script Generation ============

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
以 JSON 格式回應（不要包含 markdown code block）：
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
Respond in JSON format (without markdown code block):
{
  "script": {
    "scenes": [
      {
        "sceneNumber": 1,
        "startTime": 0,
        "endTime": 3,
        "duration": 3,
        "description": "Scene description",
        "visualPrompt": "Detailed English prompt for AI video generation...",
        "textOverlay": "Text on screen",
        "transition": "Transition effect"
      }
    ],
    "totalDuration": 30,
    "voiceoverText": "Voiceover text if needed"
  },
  "musicRecommendation": {
    "style": "Music style",
    "tempo": "Tempo (BPM range)",
    "mood": "Mood"
  },
  "colorGrading": "Color grading suggestion"
}
`;

// ============ Prompt Helpers ============

export function getInitialAnalysisPrompt(locale: Locale): string {
  return locale === "en" ? INITIAL_ANALYSIS_PROMPT_EN : INITIAL_ANALYSIS_PROMPT;
}

export function getRefinementPrompt(locale: Locale): string {
  return locale === "en" ? REFINEMENT_PROMPT_EN : REFINEMENT_PROMPT;
}

export function getFinalScriptPrompt(locale: Locale): string {
  return locale === "en" ? FINAL_SCRIPT_PROMPT_EN : FINAL_SCRIPT_PROMPT;
}

export function buildInitialPrompt(
  imageCount: number,
  description: string,
  locale: Locale
): string {
  const template = getInitialAnalysisPrompt(locale);
  return template
    .replace("{imageCount}", String(imageCount))
    .replace("{userDescription}", description);
}

export function buildRefinementPrompt(
  iterationNumber: number,
  previousSelection: { title: string; concept: string },
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
  totalImageCount: number,
  locale: Locale
): string {
  const template = getRefinementPrompt(locale);
  return template
    .replace("{iterationNumber}", String(iterationNumber))
    .replace("{previousSelectionTitle}", previousSelection.title)
    .replace("{previousSelectionConcept}", previousSelection.concept)
    .replace("{userAdjustment}", userAdjustment || "No specific adjustments")
    .replace("{newImageCount}", String(newImageCount))
    .replace("{additionalText}", additionalText || "None")
    .replace("{totalImageCount}", String(totalImageCount));
}

export function buildFinalScriptPrompt(
  title: string,
  concept: string,
  style: string,
  duration: number,
  ratio: string,
  imageCount: number,
  imageDescriptions: string,
  locale: Locale
): string {
  const template = getFinalScriptPrompt(locale);
  return template
    .replace("{title}", title)
    .replace("{concept}", concept)
    .replace("{style}", style)
    .replace("{duration}", String(duration))
    .replace("{ratio}", ratio)
    .replace("{imageCount}", String(imageCount))
    .replace("{imageDescriptions}", imageDescriptions);
}
