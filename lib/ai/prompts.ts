import type { Locale, VideoRatio, ConsistencyMode, ImageUsageMode, SceneMode, MotionDynamics, QualityBooster, CameraMotion } from "@/types";

// ============ Veo 3.1 Optimized Vocabulary ============
// Based on Google's official Veo 3.1 documentation and best practices

export const VEO_VOCABULARY = {
  // Camera Movements - Veo 3.1 responds well to these
  cameraMovements: {
    dolly: ["dolly in", "dolly out", "dolly push", "pull back", "dolly shot"],
    orbit: ["orbit shot", "360 orbit", "arc shot", "180-degree arc shot"],
    tracking: ["tracking shot", "follow shot", "steadicam", "truck shot"],
    crane: ["crane shot", "crane up", "crane down", "jib shot", "pedestal"],
    aerial: ["aerial view", "drone shot", "bird's-eye view"],
    pan: ["slow pan", "pan left", "pan right", "whip pan"],
    tilt: ["tilt up", "tilt down"],
    static: ["static shot", "locked-off", "tripod shot"],
    pov: ["POV shot", "point-of-view", "first-person view"],
    zoom: ["zoom in", "zoom out", "dolly zoom", "vertigo effect"],
  },

  // Composition & Framing
  composition: {
    shots: ["wide shot", "medium shot", "close-up", "extreme close-up", "full shot", "two-shot"],
    angles: ["eye-level", "low-angle", "high-angle", "dutch angle", "worm's-eye view", "over-the-shoulder"],
  },

  // Lens & Focus Effects
  lensEffects: {
    focus: ["shallow depth of field", "deep focus", "rack focus", "soft focus", "bokeh"],
    lens: ["wide-angle lens", "telephoto lens", "macro lens", "fisheye lens"],
    effects: ["lens flare", "anamorphic lens", "tilt-shift"],
  },

  // Lighting - Key terms Veo 3.1 understands
  lighting: {
    natural: ["natural light", "golden hour", "morning sunlight", "moonlight", "overcast light", "dappled sunlight"],
    artificial: ["studio lighting", "neon lights", "fireplace glow", "candlelight", "fluorescent light"],
    cinematic: ["Rembrandt lighting", "film noir lighting", "backlighting", "silhouette", "rim light", "key light"],
    atmospheric: ["volumetric lighting", "god rays", "haze", "fog"],
    quality: ["soft light", "hard light", "diffused light", "dramatic lighting", "high-key", "low-key"],
  },

  // Visual Styles & Aesthetics
  styles: {
    cinematic: ["cinematic", "filmic", "movie-like", "theatrical", "epic"],
    commercial: ["commercial", "premium", "luxury", "high-end", "advertising-grade"],
    documentary: ["documentary style", "authentic", "raw", "naturalistic", "verité"],
    artistic: ["photorealistic", "hyperrealistic", "stylized", "impressionistic", "surrealist"],
    mood: ["ethereal", "dreamy", "moody", "atmospheric", "intimate", "grand"],
    vintage: ["vintage", "retro", "film grain", "1980s color film", "analog"],
  },

  // Tone & Mood Keywords
  moods: {
    positive: ["joyful", "vibrant", "energetic", "warm", "inviting", "hopeful"],
    calm: ["peaceful", "serene", "tranquil", "meditative", "contemplative"],
    dramatic: ["suspenseful", "tense", "mysterious", "ominous", "epic"],
    emotional: ["melancholic", "nostalgic", "romantic", "bittersweet", "intimate"],
  },

  // Color & Ambiance
  colorGrading: {
    temperature: ["warm tones", "cool tones", "neutral palette"],
    styles: ["teal and orange", "monochromatic", "vibrant colors", "muted tones", "earthy palette", "pastel"],
    effects: ["color grading", "color correction", "high contrast", "desaturated", "rich blacks"],
  },

  // Motion & Temporal
  motion: {
    speed: ["slow-motion", "real-time", "fast-paced", "time-lapse", "hyperlapse"],
    quality: ["smooth motion", "fluid movement", "seamless", "continuous"],
    dynamics: ["subtle movement", "dramatic movement", "rhythmic", "pulsating"],
  },

  // Technical Quality
  quality: {
    resolution: ["4K quality", "high resolution", "crisp", "sharp"],
    production: ["professional-grade", "broadcast quality", "production value"],
    texture: ["film texture", "clean digital", "grain-free"],
  },
};

// Quality Boosters - Phrases that enhance Veo 3.1 output
export const QUALITY_BOOSTERS = {
  commercial: "premium commercial quality, advertising-grade production value, meticulous attention to detail",
  cinematic: "cinematic depth of field, film-like color science, theatrical presentation",
  luxury: "luxury brand aesthetic, refined elegance, sophisticated visual language",
  editorial: "editorial fashion quality, high-end magazine style, polished presentation",
  documentary: "authentic documentary feel, naturalistic lighting, genuine moments",
  artistic: "visually striking composition, artistic sensibility, creative visual storytelling",
};

// Negative Prompts - What to avoid/exclude
export const NEGATIVE_PROMPTS = {
  general: "blurry, distorted, glitchy, low quality, pixelated, overexposed, underexposed, noise, artifacts",
  product: "wrong proportions, incorrect colors, missing details, warped shape, inconsistent branding",
  character: "inconsistent face, morphing features, unnatural movement, wrong clothing, changing hair",
  motion: "jerky movement, stuttering, frozen frames, unnatural motion, abrupt changes",
  composition: "bad framing, cut-off subjects, awkward composition, empty space",
};

// Platform-Specific Best Practices
export const PLATFORM_BEST_PRACTICES = {
  tiktok: {
    hook: "Pattern interrupt within first 0.5 seconds, immediate visual hook, attention-grabbing opening",
    pacing: "Fast cuts, dynamic transitions, high energy, trending audio sync",
    style: "Authentic, relatable, trend-aware, mobile-first vertical format",
  },
  reels: {
    hook: "Visual hook within first second, aesthetic-forward, discovery-optimized",
    pacing: "Polished transitions, beat-synced cuts, visual storytelling",
    style: "Aspirational, lifestyle-focused, visually cohesive",
  },
  shorts: {
    hook: "Clear value proposition upfront, thumbnail-worthy opening frame",
    pacing: "Information-dense, clear narrative arc, satisfying conclusion",
    style: "Educational or entertaining, searchable content, replay value",
  },
  youtube: {
    hook: "Strong first 5 seconds, preview of value, curiosity gap",
    pacing: "Varied pacing, B-roll integration, professional editing",
    style: "High production value, storytelling, brand consistency",
  },
};

// ============ Phase 1: Initial Analysis ============

export const INITIAL_ANALYSIS_PROMPT = `
你是一位專業的影片內容策劃師，擅長製作各種平台的爆款內容。

## 任務
分析用戶提供的圖片和描述，提出 3 種不同方向的影片創意建議。

## 輸入
- 圖片：{imageCount} 張
- 用戶描述：{userDescription}
- 影片比例：{videoRatio}
- 目標平台：{platformDescription}

## 輸出要求
提供 3 種 **差異化明顯** 的影片方向：
1. **安全牌**：最直覺、最符合用戶描述的方向
2. **創意牌**：有創意轉折或意外角度的方向
3. **爆款牌**：參考當前平台熱門趨勢的方向

每個方向需包含：
- title: 簡短吸睛的標題（5-10字）
- concept: 影片概念描述（50-80字）
- style: 影片風格（cinematic/dynamic/storytelling/product-demo/tutorial/aesthetic/meme）
- targetPlatform: 最適合的平台（{platformOptions}）
- estimatedDuration: 建議時長（8秒，Veo 單次生成上限）
- hookIdea: 社群貼文大標題（吸睛的發文標題，適合 IG/TikTok/YouTube，5-15字）
- mainContent: 社群貼文內容（搭配影片的發文文案，50-100字，包含 emoji）
- callToAction: Hashtag 建議（5-10個相關 hashtag，用空格分隔）
- visualDirection: 視覺方向（包含以下子欄位）
  - subjectAction: 主體與動作概述（如：產品緩慢旋轉展示、模特兒走向鏡頭）
  - environment: 環境一致性描述（根據上傳圖片的環境，描述如何維持該環境的視覺一致性，如：維持圖片中的純白背景、保持城市街景的氛圍）
  - cameraStyle: 整體運鏡風格（如：穩定推進、手持跟拍、航拍俯瞰、環繞拍攝）
  - lightingMood: 光影氛圍（如：柔和自然光、霓虹冷光、電影感打光、黃金時刻暖光）
  - videoAesthetic: 影片質感（如：高級商業感、vlog隨性風、電影感、復古膠片風）
- transitionStyle: 轉場建議
- suggestedMusic: 配樂風格

## 社群貼文內容指南
根據影片比例和目標平台，撰寫適合的社群貼文內容：

**短影音平台（9:16 比例 - TikTok/Reels/Shorts）**
- hookIdea（大標題）：簡短有力、製造好奇心、適合滑動時吸引目光
- mainContent（發文內容）：口語化、包含 emoji、鼓勵互動
- callToAction（Hashtag）：熱門標籤 + 利基標籤混合

**YouTube（16:9 比例）**
- hookIdea（大標題）：描述性更強、預告影片價值
- mainContent（發文內容）：可以更詳細、說明影片亮點
- callToAction（Hashtag）：相關主題標籤

**方形影片（1:1 比例 - Instagram 貼文）**
- hookIdea（大標題）：美感導向、簡潔有力
- mainContent（發文內容）：生活風格感、互動問句
- callToAction（Hashtag）：5-10個精準標籤

## 建議設定選擇指南
根據圖片分析結果，推薦以下設定：
- consistencyMode: 產品為主→"product"，人物為主→"character"，兩者都有→"both"，風景/抽象→"none"
- motionDynamics: 產品展示/氛圍營造→"subtle"，生活場景/人物互動→"moderate"，運動/動作場景→"dramatic"
- qualityBooster: 根據內容風格選擇最適合的品質增強（商業廣告→"commercial"，電影感→"cinematic"，高端產品→"luxury"，或 "auto" 讓 AI 自動判斷）

## 回應格式
必須輸出有效的 JSON 格式（不要包含 markdown code block）。
注意：recommendedSettings 欄位中的值必須是確切的字串值，不是描述文字。

{
  "imageAnalysis": {
    "subjects": ["主要主體1", "主要主體2"],
    "subjectDetails": {
      "type": "product/person/animal/object/scene",
      "position": "center/left/right/foreground/background",
      "scale": "close-up/medium/full/wide",
      "appearance": "主體的外觀特徵描述（顏色、形狀、材質等）"
    },
    "mood": "整體氛圍（如：energetic/calm/luxurious/playful）",
    "colors": ["主色調1", "主色調2", "強調色"],
    "colorTemperature": "warm/cool/neutral",
    "setting": "場景環境描述",
    "lighting": {
      "type": "natural/studio/mixed",
      "direction": "front/side/back/top/ambient",
      "quality": "soft/hard/diffused/dramatic"
    },
    "texture": "主要材質質感（如：glossy/matte/metallic/organic）",
    "suggestedThemes": []
  },
  "recommendedSettings": {
    "consistencyMode": "選填 none 或 product 或 character 或 both",
    "motionDynamics": "選填 subtle 或 moderate 或 dramatic",
    "qualityBooster": "選填 auto 或 none 或 commercial 或 cinematic 或 luxury 或 editorial 或 documentary 或 artistic",
    "reasoning": "推薦理由（20字內）"
  },
  "suggestions": [
    {
      "title": "...",
      "concept": "...",
      "style": "...",
      "targetPlatform": "...",
      "estimatedDuration": 8,
      "hookIdea": "...",
      "mainContent": "...",
      "callToAction": "...",
      "visualDirection": {
        "subjectAction": "...",
        "environment": "...",
        "cameraStyle": "...",
        "lightingMood": "...",
        "videoAesthetic": "..."
      },
      "transitionStyle": "...",
      "suggestedMusic": "..."
    },
    { ... },
    { ... }
  ]
}
`;

export const INITIAL_ANALYSIS_PROMPT_EN = `
You are a professional video content strategist, expert in creating viral content for various platforms.

## Task
Analyze the user's provided images and description, then propose 3 different video creative directions.

## Input
- Images: {imageCount}
- User description: {userDescription}
- Video ratio: {videoRatio}
- Target platforms: {platformDescription}

## Output Requirements
Provide 3 **distinctly different** video directions:
1. **Safe Choice**: Most intuitive, closely matching the user's description
2. **Creative Choice**: Unexpected angle or creative twist
3. **Viral Choice**: Following current platform trends

Each direction must include:
- title: Short catchy title (5-10 words)
- concept: Video concept description (50-80 words)
- style: Video style (cinematic/dynamic/storytelling/product-demo/tutorial/aesthetic/meme)
- targetPlatform: Best suited platform ({platformOptions})
- estimatedDuration: Suggested duration (8 seconds, Veo single generation limit)
- hookIdea: Social post title (catchy headline for IG/TikTok/YouTube, 5-15 words)
- mainContent: Social post content (caption to accompany the video, 50-100 words, include emoji)
- callToAction: Hashtag suggestions (5-10 relevant hashtags, separated by spaces)
- visualDirection: Visual direction (with sub-fields)
  - subjectAction: Subject and action overview (e.g., product slowly rotating, model walking toward camera)
  - environment: Environment consistency description (based on the uploaded image's environment, describe how to maintain visual consistency, e.g., maintain the pure white background from the image, preserve the city street atmosphere)
  - cameraStyle: Overall camera style (e.g., steady push-in, handheld tracking, aerial view, orbit shot)
  - lightingMood: Lighting mood (e.g., soft natural light, neon cold light, cinematic lighting, golden hour warmth)
  - videoAesthetic: Video aesthetic (e.g., premium commercial, vlog casual, cinematic, vintage film)
- transitionStyle: Transition suggestions
- suggestedMusic: Music style

## Social Post Content Guide
Create appropriate social post content based on video ratio and target platform:

**Short-form Platforms (9:16 ratio - TikTok/Reels/Shorts)**
- hookIdea (Title): Short and punchy, create curiosity, catch scrolling attention
- mainContent (Caption): Conversational, include emojis, encourage engagement
- callToAction (Hashtags): Mix of trending + niche hashtags

**YouTube (16:9 ratio)**
- hookIdea (Title): More descriptive, preview video value
- mainContent (Caption): Can be more detailed, highlight video content
- callToAction (Hashtags): Topic-relevant hashtags

**Square Videos (1:1 ratio - Instagram Posts)**
- hookIdea (Title): Aesthetic-focused, clean and impactful
- mainContent (Caption): Lifestyle feel, interactive questions
- callToAction (Hashtags): 5-10 precise hashtags

## Recommended Settings Guide
Based on image analysis, recommend the following settings:
- consistencyMode: Product focus→"product", Person focus→"character", Both→"both", Landscape/abstract→"none"
- motionDynamics: Product showcase/atmosphere→"subtle", Lifestyle/interaction→"moderate", Sports/action→"dramatic"
- qualityBooster: Choose based on content style (commercial ads→"commercial", cinematic→"cinematic", luxury products→"luxury", or "auto" to let AI decide)

## Response Format
Must output valid JSON format (without markdown code block).
Note: Values in recommendedSettings must be exact string values, not descriptive text.

{
  "imageAnalysis": {
    "subjects": ["main subject 1", "main subject 2"],
    "subjectDetails": {
      "type": "product/person/animal/object/scene",
      "position": "center/left/right/foreground/background",
      "scale": "close-up/medium/full/wide",
      "appearance": "Description of subject appearance (color, shape, texture, etc.)"
    },
    "mood": "Overall atmosphere (e.g., energetic/calm/luxurious/playful)",
    "colors": ["primary color 1", "primary color 2", "accent color"],
    "colorTemperature": "warm/cool/neutral",
    "setting": "Scene environment description",
    "lighting": {
      "type": "natural/studio/mixed",
      "direction": "front/side/back/top/ambient",
      "quality": "soft/hard/diffused/dramatic"
    },
    "texture": "Main material texture (e.g., glossy/matte/metallic/organic)",
    "suggestedThemes": []
  },
  "recommendedSettings": {
    "consistencyMode": "choose: none, product, character, or both",
    "motionDynamics": "choose: subtle, moderate, or dramatic",
    "qualityBooster": "choose: auto, none, commercial, cinematic, luxury, editorial, documentary, or artistic",
    "reasoning": "Brief explanation (under 20 words)"
  },
  "suggestions": [
    {
      "title": "...",
      "concept": "...",
      "style": "...",
      "targetPlatform": "...",
      "estimatedDuration": 8,
      "hookIdea": "...",
      "mainContent": "...",
      "callToAction": "...",
      "visualDirection": {
        "subjectAction": "...",
        "environment": "...",
        "cameraStyle": "...",
        "lightingMood": "...",
        "videoAesthetic": "..."
      },
      "transitionStyle": "...",
      "suggestedMusic": "..."
    },
    { ... },
    { ... }
  ]
}
`;

// ============ Phase 2: Refinement ============

export const REFINEMENT_PROMPT = `
你是一位專業的影片內容策劃師。

## 背景
用戶正在進行第 {iterationNumber} 輪的創意精煉。

### 影片規格
- 影片比例：{videoRatio}
- 目標平台：{platformDescription}

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

每個方向需包含：
- title: 簡短吸睛的標題（5-10字）
- concept: 影片概念描述（50-80字）
- style: 影片風格（cinematic/dynamic/storytelling/product-demo/tutorial/aesthetic/meme）
- targetPlatform: 最適合的平台（{platformOptions}）
- estimatedDuration: 建議時長（8秒，Veo 單次生成上限）
- hookIdea: 前3秒的吸睛設計
- mainContent: 主要內容規劃
- callToAction: 結尾設計
- visualDirection: 視覺方向（包含以下子欄位）
  - subjectAction: 主體與動作概述
  - environment: 環境與背景基調
  - cameraStyle: 整體運鏡風格
  - lightingMood: 光影氛圍
  - videoAesthetic: 影片質感
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
    {
      "title": "...",
      "concept": "...",
      "style": "...",
      "targetPlatform": "...",
      "estimatedDuration": 30,
      "hookIdea": "...",
      "mainContent": "...",
      "callToAction": "...",
      "visualDirection": {
        "subjectAction": "...",
        "environment": "...",
        "cameraStyle": "...",
        "lightingMood": "...",
        "videoAesthetic": "..."
      },
      "transitionStyle": "...",
      "suggestedMusic": "..."
    },
    { ... },
    { ... }
  ]
}
`;

export const REFINEMENT_PROMPT_EN = `
You are a professional video content strategist.

## Background
User is on iteration round {iterationNumber} of creative refinement.

### Video Specifications
- Video ratio: {videoRatio}
- Target platforms: {platformDescription}

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

Each direction must include:
- title: Short catchy title (5-10 words)
- concept: Video concept description (50-80 words)
- style: Video style (cinematic/dynamic/storytelling/product-demo/tutorial/aesthetic/meme)
- targetPlatform: Best suited platform ({platformOptions})
- estimatedDuration: Suggested duration (8 seconds, Veo single generation limit)
- hookIdea: First 3 seconds hook design
- mainContent: Main content plan
- callToAction: Ending design
- visualDirection: Visual direction (with sub-fields)
  - subjectAction: Subject and action overview
  - environment: Environment and background
  - cameraStyle: Overall camera style
  - lightingMood: Lighting mood
  - videoAesthetic: Video aesthetic
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
    {
      "title": "...",
      "concept": "...",
      "style": "...",
      "targetPlatform": "...",
      "estimatedDuration": 30,
      "hookIdea": "...",
      "mainContent": "...",
      "callToAction": "...",
      "visualDirection": {
        "subjectAction": "...",
        "environment": "...",
        "cameraStyle": "...",
        "lightingMood": "...",
        "videoAesthetic": "..."
      },
      "transitionStyle": "...",
      "suggestedMusic": "..."
    },
    { ... },
    { ... }
  ]
}
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
- 視覺細節五要素：
  - subjectAction: 主體與動作（如：產品緩緩旋轉、手部特寫拿起商品）
  - environment: 環境與背景（如：純白攝影棚、柔焦城市夜景）
  - cameraMovement: 運鏡方式（如：緩慢推進、環繞拍攝、固定特寫）
  - lighting: 光影設定（如：頂光柔和漫射、側面輪廓光）
  - aesthetic: 質感描述（如：高級商業感、乾淨俐落）
- visualPrompt: **完整英文視頻生成提示詞**（非常重要！）
- 畫面上的文字（如有）
- 轉場效果

## visualPrompt 撰寫規範（重要！- Veo 3.1 優化版）
visualPrompt 必須是完整、詳細、可直接用於 Veo 3.1 視頻生成的英文 prompt。

### 結構公式（Veo 3.1 最佳格式）
[Cinematography/Shot] + [Subject performing action] + [in environment/setting] + [lighting description] + [aesthetic quality/style] + [motion dynamics] + [technical details]

### 必須包含的元素（依重要性排序）
1. **攝影機控制**（Veo 3.1 最重視）：
   - 鏡頭類型：close-up, medium shot, wide shot, extreme close-up, two-shot
   - 角度：eye-level, low-angle, high-angle, dutch angle, bird's-eye view
   - 運鏡：dolly in, tracking shot, orbit shot, crane up, slow pan, static shot

2. **主體動作**：清晰描述主體是什麼、在做什麼動作
   - 具體動詞：rotating, walking toward camera, reaching for, unveiling
   - 動作程度：slowly, gently, dramatically, subtly

3. **場景環境**：具體的背景和環境描述
   - 地點類型：minimalist studio, urban rooftop, cozy café interior
   - 氛圍元素：floating dust motes, steam rising, leaves falling

4. **光影設定**（Veo 3.1 理解力強）：
   - 自然光：golden hour, morning sunlight, overcast soft light, dappled sunlight
   - 人工光：studio lighting, neon glow, candlelight, Rembrandt lighting
   - 光線品質：soft diffused light, dramatic rim light, volumetric lighting, backlighting

5. **視覺風格與美學**：
   - 風格：cinematic, photorealistic, commercial, editorial, documentary style
   - 氛圍：ethereal, moody, vibrant, intimate, epic
   - 色調：warm tones, cool palette, teal and orange, muted earthy tones

6. **動態程度**（新增！）：
   - subtle movement（微動）：適合產品展示、氛圍營造
   - moderate motion（中等）：適合生活場景、人物互動
   - dramatic movement（劇烈）：適合運動、動作場景

7. **技術細節**：
   - 景深：shallow depth of field with bokeh, deep focus
   - 畫質：4K quality, crisp sharp details, film grain texture
   - 特效：lens flare, rack focus, slow-motion

### Veo 3.1 運鏡指令參考
Veo 3.1 對以下運鏡有極佳理解：
- **推軌 Dolly**：dolly in, dolly out, dolly push, pull back, dolly shot
- **環繞 Orbit**：orbit shot, 360 orbit, arc shot, 180-degree arc shot
- **跟蹤 Tracking**：tracking shot, follow shot, steadicam, truck shot
- **升降 Crane**：crane shot, crane up, crane down, jib shot, pedestal
- **搖攝 Pan/Tilt**：slow pan, pan left, pan right, tilt up, tilt down, whip pan
- **固定 Static**：static shot, locked-off, tripod shot
- **特殊 Special**：POV shot, dolly zoom (vertigo effect), aerial view, drone shot

### Veo 3.1 光線詞彙
- **自然光**：natural light, golden hour, morning sunlight, moonlight, overcast light
- **人工光**：studio lighting, neon lights, fireplace glow, fluorescent light
- **電影光**：Rembrandt lighting, film noir lighting, backlighting, silhouette, rim light
- **氣氛光**：volumetric lighting, god rays, haze, fog

### Veo 3.1 視覺風格詞彙
- **電影感**：cinematic, filmic, movie-like, theatrical, epic
- **商業感**：commercial, premium, luxury, high-end, advertising-grade
- **紀錄片**：documentary style, authentic, raw, naturalistic
- **藝術感**：photorealistic, ethereal, dreamy, moody, atmospheric
- **復古感**：vintage, retro, film grain, 1980s color film, analog

### 優秀範例（按類型 - Veo 3.1 優化版）

**商品展示（Product Showcase）：**
"Close-up shot, elegant perfume bottle rotating slowly on reflective black surface, minimalist studio environment with pure black backdrop, soft top lighting creating subtle highlights and glass reflections, slow dolly in toward bottle, subtle movement, premium luxury commercial aesthetic, shallow depth of field with creamy bokeh, photorealistic 4K quality, smooth continuous motion"

**美食展示（Food）：**
"Macro close-up slowly pulling back to medium shot, steam rising from freshly baked croissant on rustic wooden table, warm bakery interior with morning sunlight streaming through window, golden hour warmth with soft diffused natural light, appetizing food photography style, subtle movement, rich warm color grading with orange tones, shallow depth of field"

**生活場景（Lifestyle）：**
"Medium tracking shot following subject, young woman walking through sunlit cafe toward camera, cozy interior with exposed brick walls and hanging plants, warm golden hour light streaming through large windows, smooth steadicam follow shot, moderate motion, lifestyle authenticity with natural moments, subtle film grain texture, warm natural color palette"

**科技產品（Tech Product）：**
"Slow 360 orbit shot, sleek smartphone floating and rotating in dark void, holographic UI elements appearing around device, cool blue accent lighting with dramatic rim light on edges, futuristic tech commercial aesthetic, subtle movement, sharp focus with clean edges, high contrast cinematic lighting, 4K crisp quality"

**時尚/人物（Fashion/Portrait）：**
"Medium tracking shot following subject, model in flowing white dress walking toward camera on empty beach at sunset, golden hour with warm orange sky gradient, gentle ocean breeze moving fabric naturally, editorial fashion photography style, moderate motion, soft romantic backlighting creating silhouette edges, cinematic shallow depth of field"

**動態運動（Sports/Action）：**
"Low angle looking up, basketball player in mid-jump slam dunk, indoor court with dramatic overhead spotlights creating rim light, dynamic action captured with slight slow-motion, dramatic movement, high energy sports commercial style, dramatic shadows and highlights, punchy vibrant saturated colors, deep focus"

**自然風景（Nature/Landscape）：**
"Aerial drone shot slowly descending through cloud layer, misty mountain peaks emerging through clouds at sunrise, vast wilderness landscape stretching to horizon, ethereal soft morning light with volumetric god rays, subtle movement, nature documentary cinematic style, deep focus showing infinite depth, peaceful serene atmospheric mood"

**開箱/展示（Unboxing/Reveal）：**
"Close-up two-shot of hands and product, hands slowly lifting lid off premium packaging to reveal product inside, clean white studio background, soft diffused studio lighting from above, slow dolly in as product is revealed, subtle movement, satisfying ASMR-style pacing, premium commercial aesthetic, shallow depth of field on product"

### 不良示範（避免 - Veo 3.1 常見錯誤）
❌ "A product video" - 太模糊，缺乏細節，Veo 無法理解意圖
❌ "Beautiful scene with nice lighting" - 沒有具體描述，結果不可預測
❌ "產品在桌上" - 不要使用中文，Veo 3.1 僅支援英文
❌ "Fast dynamic exciting cool video" - 堆疊形容詞但無實質內容
❌ "Like Apple commercial" - 不要引用品牌，要具體描述風格
❌ "dark noir" + "bright sunny colors" - 衝突指令會導致模糊結果
❌ 引號對話太長 - 超過 8 秒的對話會導致語速過快

### Veo 3.1 特定禁止事項
- **語言**：必須全英文，不要使用中文或其他語言
- **衝突指令**：避免相互矛盾的描述（如同時要求 dark 和 bright）
- **模糊描述**：每個元素都要具體明確
- **品牌引用**：不要引用特定品牌或版權內容
- **字幕問題**：如需對話，用冒號格式 "A person says: Hello" 而非引號
- **過長對話**：對話內容應在 8 秒內可自然說完
- **每個 visualPrompt 至少 50-80 個英文單詞**

### Veo 3.1 避免字幕技巧
如果不想要自動生成的字幕，在 prompt 結尾加上 "(no subtitles)"
如需對話，使用格式：A character says: [dialogue] 而非 "dialogue"

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
        "subjectAction": "主體與動作",
        "environment": "環境與背景",
        "cameraMovement": "運鏡方式",
        "lighting": "光影設定",
        "aesthetic": "質感描述",
        "visualPrompt": "Complete English prompt combining all visual elements for AI video generation...",
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
- Visual detail elements:
  - subjectAction: Subject and action (e.g., product slowly rotating, hand close-up picking up item)
  - environment: Environment and background (e.g., white studio, soft-focus city night)
  - cameraMovement: Camera movement (e.g., slow push-in, orbit shot, fixed close-up)
  - lighting: Lighting setup (e.g., soft top diffused light, side rim light)
  - aesthetic: Aesthetic quality (e.g., premium commercial feel, clean and sharp)
- visualPrompt: **Complete English video generation prompt** (CRITICAL!)
- Text overlay (if any)
- Transition effect

## visualPrompt Writing Guidelines (CRITICAL! - Veo 3.1 Optimized)
visualPrompt must be a complete, detailed, ready-to-use English prompt for Veo 3.1 video generation.

### Structure Formula (Veo 3.1 Best Format)
[Cinematography/Shot] + [Subject performing action] + [in environment/setting] + [lighting description] + [aesthetic quality/style] + [motion dynamics] + [technical details]

### Required Elements (Priority Order)
1. **Camera Control** (Veo 3.1 prioritizes this):
   - Shot type: close-up, medium shot, wide shot, extreme close-up, two-shot
   - Angle: eye-level, low-angle, high-angle, dutch angle, bird's-eye view
   - Movement: dolly in, tracking shot, orbit shot, crane up, slow pan, static shot

2. **Subject & Action**: Clear description with specific verbs
   - Action verbs: rotating, walking toward camera, reaching for, unveiling
   - Motion degree: slowly, gently, dramatically, subtly

3. **Environment**: Specific background and setting
   - Location: minimalist studio, urban rooftop, cozy café interior
   - Atmosphere: floating dust motes, steam rising, leaves falling

4. **Lighting** (Veo 3.1 understands well):
   - Natural: golden hour, morning sunlight, overcast soft light, dappled sunlight
   - Artificial: studio lighting, neon glow, candlelight, Rembrandt lighting
   - Quality: soft diffused light, dramatic rim light, volumetric lighting, backlighting

5. **Visual Style & Aesthetics**:
   - Style: cinematic, photorealistic, commercial, editorial, documentary style
   - Mood: ethereal, moody, vibrant, intimate, epic
   - Color: warm tones, cool palette, teal and orange, muted earthy tones

6. **Motion Dynamics** (NEW!):
   - subtle movement: for product showcase, atmosphere building
   - moderate motion: for lifestyle scenes, character interaction
   - dramatic movement: for sports, action scenes

7. **Technical Details**:
   - DOF: shallow depth of field with bokeh, deep focus
   - Quality: 4K quality, crisp sharp details, film grain texture
   - Effects: lens flare, rack focus, slow-motion

### Veo 3.1 Camera Movement Reference
Veo 3.1 has excellent understanding of:
- **Dolly**: dolly in, dolly out, dolly push, pull back, dolly shot
- **Orbit**: orbit shot, 360 orbit, arc shot, 180-degree arc shot
- **Tracking**: tracking shot, follow shot, steadicam, truck shot
- **Crane**: crane shot, crane up, crane down, jib shot, pedestal
- **Pan/Tilt**: slow pan, pan left, pan right, tilt up, tilt down, whip pan
- **Static**: static shot, locked-off, tripod shot
- **Special**: POV shot, dolly zoom (vertigo effect), aerial view, drone shot

### Veo 3.1 Lighting Vocabulary
- **Natural**: natural light, golden hour, morning sunlight, moonlight, overcast light
- **Artificial**: studio lighting, neon lights, fireplace glow, fluorescent light
- **Cinematic**: Rembrandt lighting, film noir lighting, backlighting, silhouette, rim light
- **Atmospheric**: volumetric lighting, god rays, haze, fog

### Veo 3.1 Visual Style Vocabulary
- **Cinematic**: cinematic, filmic, movie-like, theatrical, epic
- **Commercial**: commercial, premium, luxury, high-end, advertising-grade
- **Documentary**: documentary style, authentic, raw, naturalistic
- **Artistic**: photorealistic, ethereal, dreamy, moody, atmospheric
- **Vintage**: vintage, retro, film grain, 1980s color film, analog

### Excellent Examples (by type - Veo 3.1 Optimized)

**Product Showcase:**
"Close-up shot, elegant perfume bottle rotating slowly on reflective black surface, minimalist studio environment with pure black backdrop, soft top lighting creating subtle highlights and glass reflections, slow dolly in toward bottle, subtle movement, premium luxury commercial aesthetic, shallow depth of field with creamy bokeh, photorealistic 4K quality, smooth continuous motion"

**Food:**
"Macro close-up slowly pulling back to medium shot, steam rising from freshly baked croissant on rustic wooden table, warm bakery interior with morning sunlight streaming through window, golden hour warmth with soft diffused natural light, appetizing food photography style, subtle movement, rich warm color grading with orange tones, shallow depth of field"

**Lifestyle:**
"Medium tracking shot following subject, young woman walking through sunlit cafe toward camera, cozy interior with exposed brick walls and hanging plants, warm golden hour light streaming through large windows, smooth steadicam follow shot, moderate motion, lifestyle authenticity with natural moments, subtle film grain texture, warm natural color palette"

**Tech Product:**
"Slow 360 orbit shot, sleek smartphone floating and rotating in dark void, holographic UI elements appearing around device, cool blue accent lighting with dramatic rim light on edges, futuristic tech commercial aesthetic, subtle movement, sharp focus with clean edges, high contrast cinematic lighting, 4K crisp quality"

**Fashion/Portrait:**
"Medium tracking shot following subject, model in flowing white dress walking toward camera on empty beach at sunset, golden hour with warm orange sky gradient, gentle ocean breeze moving fabric naturally, editorial fashion photography style, moderate motion, soft romantic backlighting creating silhouette edges, cinematic shallow depth of field"

**Sports/Action:**
"Low angle looking up, basketball player in mid-jump slam dunk, indoor court with dramatic overhead spotlights creating rim light, dynamic action captured with slight slow-motion, dramatic movement, high energy sports commercial style, dramatic shadows and highlights, punchy vibrant saturated colors, deep focus"

**Nature/Landscape:**
"Aerial drone shot slowly descending through cloud layer, misty mountain peaks emerging through clouds at sunrise, vast wilderness landscape stretching to horizon, ethereal soft morning light with volumetric god rays, subtle movement, nature documentary cinematic style, deep focus showing infinite depth, peaceful serene atmospheric mood"

**Unboxing/Reveal:**
"Close-up two-shot of hands and product, hands slowly lifting lid off premium packaging to reveal product inside, clean white studio background, soft diffused studio lighting from above, slow dolly in as product is revealed, subtle movement, satisfying pacing, premium commercial aesthetic, shallow depth of field on product"

### Bad Examples (avoid - Veo 3.1 Common Mistakes)
❌ "A product video" - Too vague, Veo cannot understand intent
❌ "Beautiful scene with nice lighting" - No specific description, unpredictable results
❌ "Fast dynamic exciting cool video" - Stacking adjectives without substance
❌ "Like Apple commercial" - Don't reference brands, describe the style specifically
❌ "dark noir" + "bright sunny colors" - Conflicting instructions cause muddy results
❌ Long quoted dialogue - Dialogue over 8 seconds causes unnaturally fast speech

### Veo 3.1 Specific Rules
- **Language**: Must be English only
- **Conflicting instructions**: Avoid contradictory descriptions (e.g., dark and bright simultaneously)
- **Vague descriptions**: Every element must be specific and clear
- **Brand references**: Don't reference specific brands or copyrighted content
- **Subtitle issue**: For dialogue, use colon format "A person says: Hello" not quotes
- **Long dialogue**: Dialogue should be naturally speakable within 8 seconds
- **Each visualPrompt should be at least 50-80 words**

### Veo 3.1 Subtitle Avoidance Tips
To avoid auto-generated subtitles, add "(no subtitles)" at the end of prompt
For dialogue, use format: A character says: [dialogue] instead of "dialogue"

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
        "subjectAction": "Subject and action",
        "environment": "Environment and background",
        "cameraMovement": "Camera movement",
        "lighting": "Lighting setup",
        "aesthetic": "Aesthetic quality",
        "visualPrompt": "Complete English prompt combining all visual elements for AI video generation...",
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

/**
 * Get platform options and description based on video ratio
 */
export function getPlatformInfoByRatio(ratio: VideoRatio, locale: Locale): {
  options: string;
  description: string;
  bestPractices: string;
} {
  if (ratio === "16:9") {
    return {
      options: "youtube",
      description: locale === "en"
        ? "YouTube (horizontal 16:9 format)"
        : "YouTube（橫向 16:9 格式）",
      bestPractices: locale === "en"
        ? PLATFORM_BEST_PRACTICES.youtube.hook + ". " + PLATFORM_BEST_PRACTICES.youtube.style
        : "開頭5秒要強力吸引眼球，展示價值預覽，高製作質感，故事敘述，品牌一致性",
    };
  } else if (ratio === "1:1") {
    return {
      options: "instagram",
      description: locale === "en"
        ? "Instagram Posts (square 1:1 format)"
        : "Instagram 貼文（方形 1:1 格式）",
      bestPractices: locale === "en"
        ? "Visual hook within first frame, aesthetic-forward, discovery-optimized, polished transitions"
        : "首幀視覺吸引，美學優先，適合探索頁，精緻轉場",
    };
  } else {
    // 9:16
    return {
      options: "reels/shorts/tiktok",
      description: locale === "en"
        ? "Instagram Reels, YouTube Shorts, TikTok (vertical 9:16 format)"
        : "Instagram Reels、YouTube Shorts、TikTok（直向 9:16 格式）",
      bestPractices: locale === "en"
        ? "Pattern interrupt within first 0.5 seconds, immediate visual hook, fast cuts, high energy, mobile-first vertical format"
        : "前0.5秒要有視覺衝擊，立即吸引注意力，快速剪輯，高能量，行動優先的直向格式",
    };
  }
}

/**
 * Get platform-specific hook recommendations
 */
export function getPlatformHookRecommendation(
  platform: string,
  locale: Locale
): string {
  const hooks: Record<string, { zh: string; en: string }> = {
    tiktok: {
      zh: "前0.5秒必須有視覺衝擊（快速動作、意外畫面、強烈對比）",
      en: "First 0.5s needs visual impact (fast action, unexpected visuals, strong contrast)",
    },
    reels: {
      zh: "首幀要有美學吸引力，適合停留觀看，視覺故事開端",
      en: "First frame needs aesthetic appeal, scroll-stopping quality, visual story opening",
    },
    shorts: {
      zh: "開頭要清楚傳達價值，縮圖要吸睛，有明確的內容承諾",
      en: "Clear value proposition upfront, thumbnail-worthy opening, clear content promise",
    },
    youtube: {
      zh: "前5秒建立興趣，展示即將呈現的精彩內容，創造好奇心",
      en: "First 5s establishes interest, preview of exciting content to come, create curiosity gap",
    },
  };

  const normalizedPlatform = platform.toLowerCase();
  for (const [key, value] of Object.entries(hooks)) {
    if (normalizedPlatform.includes(key)) {
      return locale === "en" ? value.en : value.zh;
    }
  }

  // Default
  return locale === "en"
    ? "Strong visual hook in opening frames to capture attention immediately"
    : "開場要有強烈的視覺吸引力，立即抓住觀眾注意力";
}

export function buildInitialPrompt(
  imageCount: number,
  description: string,
  locale: Locale,
  ratio: VideoRatio = "9:16"
): string {
  const template = getInitialAnalysisPrompt(locale);
  const platformInfo = getPlatformInfoByRatio(ratio, locale);

  // Add platform best practices to the prompt
  const platformBestPracticesSection = locale === "en"
    ? `\n\n## Platform Best Practices\n${platformInfo.bestPractices}\nApply these principles when designing the hook and pacing for each suggestion.`
    : `\n\n## 平台最佳實踐\n${platformInfo.bestPractices}\n請在設計每個建議的開場和節奏時應用這些原則。`;

  return template
    .replace("{imageCount}", String(imageCount))
    .replace("{userDescription}", description)
    .replace("{videoRatio}", ratio)
    .replace("{platformDescription}", platformInfo.description + platformBestPracticesSection)
    .replace("{platformOptions}", platformInfo.options);
}

export function buildRefinementPrompt(
  iterationNumber: number,
  previousSelection: { title: string; concept: string },
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
  totalImageCount: number,
  locale: Locale,
  ratio: VideoRatio = "9:16"
): string {
  const template = getRefinementPrompt(locale);
  const platformInfo = getPlatformInfoByRatio(ratio, locale);
  return template
    .replace("{iterationNumber}", String(iterationNumber))
    .replace("{previousSelectionTitle}", previousSelection.title)
    .replace("{previousSelectionConcept}", previousSelection.concept)
    .replace("{userAdjustment}", userAdjustment || "No specific adjustments")
    .replace("{newImageCount}", String(newImageCount))
    .replace("{additionalText}", additionalText || "None")
    .replace("{totalImageCount}", String(totalImageCount))
    .replace("{videoRatio}", ratio)
    .replace("{platformDescription}", platformInfo.description)
    .replace("{platformOptions}", platformInfo.options);
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

// ============ Phase 4: Script Refinement ============

export const SCRIPT_REFINEMENT_PROMPT = `
你是一位專業的短影片腳本編劇和分鏡師。

## 任務
根據用戶的調整指示，修改現有的影片腳本。

### 當前腳本
\`\`\`json
{currentScript}
\`\`\`

### 用戶調整指示
{userAdjustment}

## 輸出要求
1. 理解用戶的調整意圖
2. 保持整體結構和時長不變（除非用戶明確要求調整）
3. 針對性地修改相關場景
4. 確保修改後的腳本流暢連貫
5. 更新受影響場景的 visualPrompt

## 回應格式
以 JSON 格式回應（不要包含 markdown code block），格式與原腳本相同：
{
  "script": {
    "scenes": [...],
    "totalDuration": number,
    "voiceoverText": "..."
  },
  "musicRecommendation": {...},
  "colorGrading": "..."
}
`;

export const SCRIPT_REFINEMENT_PROMPT_EN = `
You are a professional short-form video scriptwriter and storyboard artist.

## Task
Modify the existing video script based on the user's adjustment instructions.

### Current Script
\`\`\`json
{currentScript}
\`\`\`

### User Adjustment Instructions
{userAdjustment}

## Output Requirements
1. Understand the user's adjustment intent
2. Keep the overall structure and duration unchanged (unless user explicitly requests changes)
3. Make targeted modifications to relevant scenes
4. Ensure the modified script flows smoothly
5. Update visualPrompt for affected scenes

## Response Format
Respond in JSON format (without markdown code blocks), same structure as the original script:
{
  "script": {
    "scenes": [...],
    "totalDuration": number,
    "voiceoverText": "..."
  },
  "musicRecommendation": {...},
  "colorGrading": "..."
}
`;

export function getScriptRefinementPrompt(locale: Locale): string {
  return locale === "en" ? SCRIPT_REFINEMENT_PROMPT_EN : SCRIPT_REFINEMENT_PROMPT;
}

export function buildScriptRefinementPrompt(
  currentScript: string,
  userAdjustment: string,
  locale: Locale
): string {
  const template = getScriptRefinementPrompt(locale);
  return template
    .replace("{currentScript}", currentScript)
    .replace("{userAdjustment}", userAdjustment);
}

// ============ Consistency Enhancement ============

/**
 * Get image usage instruction for the script generation prompt
 */
export function getImageUsageInstruction(
  mode: ImageUsageMode,
  locale: Locale
): string {
  const instructions: Record<ImageUsageMode, { zh: string; en: string }> = {
    start: {
      zh: `## 圖片使用方式
用戶選擇「影片開頭使用圖片」：
- 第一個場景應以參考圖片為起點
- 從靜態圖片過渡到動態內容
- 開場視覺應與參考圖片高度一致`,
      en: `## Image Usage
User selected "Use image at video start":
- First scene should start from the reference image
- Transition from static image to dynamic content
- Opening visuals should closely match the reference image`,
    },
    none: {
      zh: `## 圖片使用方式
用戶選擇「不使用參考圖片」：
- 完全根據文字描述創作
- 不需要考慮與參考圖片的視覺一致性
- 可以自由發揮創意`,
      en: `## Image Usage
User selected "Do not use reference image":
- Create entirely from text description
- No need to match reference image visually
- Full creative freedom`,
    },
  };

  return instructions[mode][locale === "en" ? "en" : "zh"];
}

/**
 * Get consistency instruction for the script generation prompt
 */
export function getConsistencyPromptSection(
  mode: ConsistencyMode,
  locale: Locale
): string {
  if (mode === "none") {
    return "";
  }

  const instructions: Record<Exclude<ConsistencyMode, "none">, { zh: string; en: string }> = {
    product: {
      zh: `## 視覺一致性要求
用戶強調「產品一致性」：
- 所有場景中的產品必須保持完全一致的外觀
- 產品的顏色、形狀、比例、紋理、品牌元素不可改變
- 在 visualPrompt 中明確強調產品特徵的一致性
- 即使運鏡或光影變化，產品本身的視覺特徵必須保持不變`,
      en: `## Visual Consistency Requirements
User emphasizes "Product Consistency":
- Product must maintain identical appearance across all scenes
- Product color, shape, proportions, texture, brand elements must NOT change
- Explicitly emphasize product feature consistency in visualPrompt
- Even with camera or lighting changes, product visual features must remain constant`,
    },
    character: {
      zh: `## 視覺一致性要求
用戶強調「人物一致性」：
- 所有場景中的人物必須保持完全一致的外貌
- 人物的臉部特徵、髮型、髮色、服裝、配飾不可改變
- 在 visualPrompt 中明確強調人物特徵的一致性
- 人物的體態、膚色、整體形象必須在影片中保持一致`,
      en: `## Visual Consistency Requirements
User emphasizes "Character Consistency":
- Character must maintain identical appearance across all scenes
- Facial features, hairstyle, hair color, clothing, accessories must NOT change
- Explicitly emphasize character feature consistency in visualPrompt
- Body type, skin tone, overall image must remain consistent throughout`,
    },
    both: {
      zh: `## 視覺一致性要求
用戶強調「完全一致性」（產品 + 人物）：
- 所有場景中的產品和人物都必須保持完全一致的外觀
- 產品：顏色、形狀、比例、紋理、品牌元素不可改變
- 人物：臉部特徵、髮型、服裝、配飾不可改變
- 在每個場景的 visualPrompt 中都要明確強調一致性要求
- 這是最高級別的視覺一致性要求`,
      en: `## Visual Consistency Requirements
User emphasizes "Full Consistency" (Product + Character):
- Both product and character must maintain identical appearance across all scenes
- Product: color, shape, proportions, texture, brand elements must NOT change
- Character: facial features, hairstyle, clothing, accessories must NOT change
- Explicitly emphasize consistency requirements in each scene's visualPrompt
- This is the highest level of visual consistency requirement`,
    },
  };

  return instructions[mode][locale === "en" ? "en" : "zh"];
}

// ============ Scene Mode Instructions ============

/**
 * Get scene mode instruction for the script generation prompt
 * Determines whether to generate single continuous shot or multi-scene video
 */
export function getSceneModeInstruction(
  mode: SceneMode,
  duration: number,
  locale: Locale
): string {
  // Auto mode: decide based on duration
  // ≤8 seconds = single scene (Veo can generate in one shot)
  // >8 seconds = multi scene (requires extension, may lose consistency)
  const effectiveMode = mode === "auto"
    ? (duration <= 8 ? "single" : "multi")
    : mode;

  const instructions: Record<Exclude<SceneMode, "auto">, { zh: string; en: string }> = {
    single: {
      zh: `## 場景模式：單一連續鏡頭
此影片將作為「單一連續鏡頭」生成：
- 整部影片只有 1 個場景（scene）
- 不要分割成多個場景或多個鏡頭
- 使用連續流暢的運鏡（如：緩慢推進、環繞、跟拍等）
- 所有動作和變化應在同一個連續鏡頭內完成
- 這種模式能獲得最佳的視覺一致性

### 單場景限制
- 最長 8 秒（Veo 單次生成上限）
- 場景內的時間流動應自然連貫
- visualPrompt 應描述整個連續動作的過程`,
      en: `## Scene Mode: Single Continuous Shot
This video will be generated as a "single continuous shot":
- Entire video has only 1 scene
- Do NOT split into multiple scenes or shots
- Use continuous fluid camera movement (e.g., slow push-in, orbit, tracking)
- All action and changes should occur within one continuous shot
- This mode provides the best visual consistency

### Single Scene Constraints
- Maximum 8 seconds (Veo single generation limit)
- Time flow within the scene should be natural and continuous
- visualPrompt should describe the entire continuous action process`,
    },
    multi: {
      zh: `## 場景模式：多場景敘事
此影片將作為「多場景」影片生成：
- 可以有多個場景（scenes），每個場景 3-8 秒
- 適合故事敘述、產品多角度展示、情節發展
- 每個場景應有明確的視覺區隔和過渡
- 使用轉場效果連接不同場景

### 多場景注意事項
- 每個場景的 visualPrompt 應該獨立完整
- 注意場景之間的視覺連貫性（顏色、風格、氛圍）
- 超過 8 秒的影片會使用 AI 延展功能，視覺一致性可能會降低

### 場景銜接指導（重要！）
為確保場景之間流暢銜接，請遵循以下原則：

1. **視覺錨點連續性**
   - 前一場景結尾和後一場景開頭應有共同的視覺元素
   - 例如：Scene 1 結尾是手拿產品 → Scene 2 開頭也應包含手和產品

2. **運鏡邏輯連貫**
   - 避免突兀的運鏡跳轉
   - 推薦組合：push in → cut → wide shot、orbit → dissolve → close-up
   - 避免：fast pan → cut → fast pan（太混亂）

3. **色調統一**
   - 所有場景使用相同的色調基調（warm/cool/neutral）
   - 在每個 visualPrompt 中重複提及色調設定

4. **轉場建議**
   - cut：快節奏、現代感
   - dissolve/cross-fade：夢幻、回憶
   - wipe：能量感、動態
   - match cut：專業、精緻

5. **場景間 Prompt 銜接技巧**
   - 在後一場景的 visualPrompt 開頭加入「continuing from...」或「transitioning to...」
   - 保持相同的 aesthetic 描述詞彙`,
      en: `## Scene Mode: Multi-Scene Narrative
This video will be generated as "multi-scene" video:
- Can have multiple scenes, each 3-8 seconds
- Suitable for storytelling, multi-angle product showcase, plot development
- Each scene should have clear visual distinction and transition
- Use transition effects to connect different scenes

### Multi-Scene Notes
- Each scene's visualPrompt should be independent and complete
- Pay attention to visual continuity between scenes (colors, style, mood)
- Videos over 8 seconds will use AI extension, visual consistency may decrease

### Scene Transition Guidelines (IMPORTANT!)
To ensure smooth transitions between scenes, follow these principles:

1. **Visual Anchor Continuity**
   - End of previous scene and start of next scene should share visual elements
   - Example: Scene 1 ends with hand holding product → Scene 2 should also include hand and product

2. **Camera Movement Logic**
   - Avoid abrupt camera jumps
   - Recommended combinations: push in → cut → wide shot, orbit → dissolve → close-up
   - Avoid: fast pan → cut → fast pan (too chaotic)

3. **Color Tone Consistency**
   - All scenes use same color temperature base (warm/cool/neutral)
   - Repeat color grading description in each visualPrompt

4. **Transition Suggestions**
   - cut: fast-paced, modern feel
   - dissolve/cross-fade: dreamy, nostalgic
   - wipe: energetic, dynamic
   - match cut: professional, refined

5. **Inter-Scene Prompt Linking Techniques**
   - Add "continuing from..." or "transitioning to..." at the start of next scene's visualPrompt
   - Maintain same aesthetic vocabulary throughout`,
    },
  };

  return instructions[effectiveMode][locale === "en" ? "en" : "zh"];
}

/**
 * Check if the video needs extension (duration > 8 seconds)
 * Returns true if extension is needed, which may affect consistency
 */
export function needsVideoExtension(duration: number): boolean {
  return duration > 8;
}

/**
 * Get consistency warning for videos that need extension
 */
export function getExtensionConsistencyWarning(locale: Locale): string {
  return locale === "en"
    ? "⚠️ This video exceeds 8 seconds and will use AI extension. Visual consistency between segments may vary."
    : "⚠️ 此影片超過 8 秒，將使用 AI 延展功能。片段之間的視覺一致性可能會有所不同。";
}

/**
 * Get motion dynamics instruction based on selected level
 */
export function getMotionDynamicsInstruction(
  dynamics: MotionDynamics,
  locale: Locale
): string {
  const instructions: Record<MotionDynamics, { zh: string; en: string }> = {
    subtle: {
      zh: `## 動態程度：微妙
在 visualPrompt 中應用以下動態設定：
- 使用緩慢、優雅的動態（slow-motion, gentle movement, subtle drift）
- 適合：產品展示、氛圍營造、需要精緻感的內容
- 運鏡建議：slow push in, gentle orbit, steady dolly, subtle parallax
- 避免：快速移動、劇烈變化、突然的鏡頭切換
- 在每個 visualPrompt 中加入 "gentle", "slow", "subtle motion" 等描述`,
      en: `## Motion Dynamics: Subtle
Apply these motion settings in visualPrompt:
- Use slow, elegant movements (slow-motion, gentle movement, subtle drift)
- Suitable for: product showcase, atmosphere creation, refined content
- Camera suggestions: slow push in, gentle orbit, steady dolly, subtle parallax
- Avoid: fast movements, dramatic changes, sudden camera cuts
- Include "gentle", "slow", "subtle motion" in each visualPrompt`,
    },
    moderate: {
      zh: `## 動態程度：中等
在 visualPrompt 中應用以下動態設定：
- 使用自然流暢的動態（natural movement, smooth motion）
- 適合：生活場景、人物互動、自然流暢的動態敘事
- 運鏡建議：tracking shot, pan, follow cam, handheld-style smooth
- 保持動態自然但不過度
- 在每個 visualPrompt 中加入 "natural motion", "smooth movement" 等描述`,
      en: `## Motion Dynamics: Moderate
Apply these motion settings in visualPrompt:
- Use natural, smooth movements (natural movement, smooth motion)
- Suitable for: lifestyle scenes, character interaction, natural storytelling
- Camera suggestions: tracking shot, pan, follow cam, handheld-style smooth
- Keep motion natural but not excessive
- Include "natural motion", "smooth movement" in each visualPrompt`,
    },
    dramatic: {
      zh: `## 動態程度：劇烈
在 visualPrompt 中應用以下動態設定：
- 使用強烈、動感的動態（dynamic motion, fast movement, energetic action）
- 適合：運動、動作場景、需要強烈視覺衝擊的內容
- 運鏡建議：fast pan, quick zoom, rapid tracking, dramatic dolly
- 可以使用速度變化（speed ramp from slow to fast）
- 在每個 visualPrompt 中加入 "dynamic", "energetic", "fast-paced" 等描述`,
      en: `## Motion Dynamics: Dramatic
Apply these motion settings in visualPrompt:
- Use strong, dynamic movements (dynamic motion, fast movement, energetic action)
- Suitable for: sports, action scenes, high visual impact content
- Camera suggestions: fast pan, quick zoom, rapid tracking, dramatic dolly
- Can use speed variations (speed ramp from slow to fast)
- Include "dynamic", "energetic", "fast-paced" in each visualPrompt`,
    },
  };

  return instructions[dynamics][locale === "en" ? "en" : "zh"];
}

/**
 * Get quality booster instruction based on selected style
 */
export function getQualityBoosterInstruction(
  booster: QualityBooster,
  locale: Locale
): string {
  if (booster === "auto" || booster === "none") {
    return ""; // Let AI choose naturally or no enhancement
  }

  const instructions: Record<Exclude<QualityBooster, "auto" | "none">, { zh: string; en: string }> = {
    commercial: {
      zh: `## 品質增強：商業級製作
在每個 visualPrompt 結尾加入以下品質增強詞：
"professional commercial production, polished advertising quality, clean crisp visuals, studio lighting precision, brand-ready finish"`,
      en: `## Quality Boost: Commercial Grade
Add these quality enhancers at the end of each visualPrompt:
"professional commercial production, polished advertising quality, clean crisp visuals, studio lighting precision, brand-ready finish"`,
    },
    cinematic: {
      zh: `## 品質增強：電影級視覺
在每個 visualPrompt 結尾加入以下品質增強詞：
"cinematic quality, film-grade visuals, shallow depth of field, anamorphic lens flare, color graded like feature film, theatrical presentation"`,
      en: `## Quality Boost: Cinematic
Add these quality enhancers at the end of each visualPrompt:
"cinematic quality, film-grade visuals, shallow depth of field, anamorphic lens flare, color graded like feature film, theatrical presentation"`,
    },
    luxury: {
      zh: `## 品質增強：奢侈品美學
在每個 visualPrompt 結尾加入以下品質增強詞：
"luxury brand aesthetic, premium quality finish, elegant sophistication, high-end production value, refined minimalist style, opulent visual treatment"`,
      en: `## Quality Boost: Luxury Aesthetic
Add these quality enhancers at the end of each visualPrompt:
"luxury brand aesthetic, premium quality finish, elegant sophistication, high-end production value, refined minimalist style, opulent visual treatment"`,
    },
    editorial: {
      zh: `## 品質增強：編輯級時尚
在每個 visualPrompt 結尾加入以下品質增強詞：
"editorial fashion photography style, magazine cover quality, high fashion aesthetic, avant-garde visual approach, fashion editorial lighting"`,
      en: `## Quality Boost: Editorial Fashion
Add these quality enhancers at the end of each visualPrompt:
"editorial fashion photography style, magazine cover quality, high fashion aesthetic, avant-garde visual approach, fashion editorial lighting"`,
    },
    documentary: {
      zh: `## 品質增強：紀錄片真實感
在每個 visualPrompt 結尾加入以下品質增強詞：
"documentary style authenticity, natural lighting, candid real-world aesthetic, genuine atmosphere, observational cinematography, unscripted feel"`,
      en: `## Quality Boost: Documentary Authenticity
Add these quality enhancers at the end of each visualPrompt:
"documentary style authenticity, natural lighting, candid real-world aesthetic, genuine atmosphere, observational cinematography, unscripted feel"`,
    },
    artistic: {
      zh: `## 品質增強：藝術感視覺
在每個 visualPrompt 結尾加入以下品質增強詞：
"artistic visual expression, creative cinematography, painterly quality, art house aesthetic, visually poetic, experimental visual style"`,
      en: `## Quality Boost: Artistic Visual
Add these quality enhancers at the end of each visualPrompt:
"artistic visual expression, creative cinematography, painterly quality, art house aesthetic, visually poetic, experimental visual style"`,
    },
  };

  return instructions[booster][locale === "en" ? "en" : "zh"];
}

/**
 * Get camera motion instruction for the script generation prompt
 * This tells the AI to constrain all visualPrompts to use only the specified camera motion
 */
export function getCameraMotionInstruction(
  motion: CameraMotion,
  locale: Locale
): string {
  if (motion === "auto") {
    return ""; // Let AI choose naturally
  }

  const instructions: Record<Exclude<CameraMotion, "auto">, { zh: string; en: string }> = {
    static: {
      zh: `## 運鏡限制：完全靜止
用戶選擇了「靜止」運鏡模式：
- **所有場景的 cameraMovement 必須設為 "static shot" 或 "locked-off camera"**
- **visualPrompt 中禁止包含任何運鏡描述**（禁止：dolly、pan、tilt、tracking、orbit、crane、zoom 等）
- 只允許畫面內的微小變化（如：空氣中漂浮的塵埃、柔和的光線變化）
- 主體可以有動作，但鏡頭本身必須完全固定
- 在每個 visualPrompt 開頭加入 "completely static camera, locked-off tripod shot"`,
      en: `## Camera Motion Restriction: Completely Static
User selected "Static" camera mode:
- **All scenes' cameraMovement must be "static shot" or "locked-off camera"**
- **visualPrompt must NOT include any camera movement descriptions** (NO: dolly, pan, tilt, tracking, orbit, crane, zoom, etc.)
- Only allow subtle in-frame changes (e.g., floating dust particles, gentle light variations)
- Subject can have motion, but camera itself must be completely fixed
- Add "completely static camera, locked-off tripod shot" at the start of each visualPrompt`,
    },
    push: {
      zh: `## 運鏡限制：推進
用戶選擇了「推進」運鏡模式：
- 所有場景使用緩慢的推進運鏡（dolly in / push in）
- 在每個 visualPrompt 中加入 "very slow dolly in" 或 "gentle push toward subject"
- 禁止使用其他類型的運鏡（pan、tilt、orbit 等）`,
      en: `## Camera Motion Restriction: Push In
User selected "Push" camera mode:
- All scenes use slow push-in movement (dolly in / push in)
- Add "very slow dolly in" or "gentle push toward subject" in each visualPrompt
- Do NOT use other camera movements (pan, tilt, orbit, etc.)`,
    },
    pull: {
      zh: `## 運鏡限制：拉遠
用戶選擇了「拉遠」運鏡模式：
- 所有場景使用緩慢的拉遠運鏡（dolly out / pull back）
- 在每個 visualPrompt 中加入 "very slow dolly out" 或 "gentle pull back"
- 禁止使用其他類型的運鏡（pan、tilt、orbit 等）`,
      en: `## Camera Motion Restriction: Pull Out
User selected "Pull" camera mode:
- All scenes use slow pull-out movement (dolly out / pull back)
- Add "very slow dolly out" or "gentle pull back" in each visualPrompt
- Do NOT use other camera movements (pan, tilt, orbit, etc.)`,
    },
    pan_right: {
      zh: `## 運鏡限制：右平移
用戶選擇了「右平移」運鏡模式：
- 所有場景使用從左到右的水平平移
- 在每個 visualPrompt 中加入 "slow pan right" 或 "horizontal pan from left to right"
- 禁止使用其他類型的運鏡（dolly、tilt、orbit 等）`,
      en: `## Camera Motion Restriction: Pan Right
User selected "Pan Right" camera mode:
- All scenes use horizontal pan from left to right
- Add "slow pan right" or "horizontal pan from left to right" in each visualPrompt
- Do NOT use other camera movements (dolly, tilt, orbit, etc.)`,
    },
    pan_left: {
      zh: `## 運鏡限制：左平移
用戶選擇了「左平移」運鏡模式：
- 所有場景使用從右到左的水平平移
- 在每個 visualPrompt 中加入 "slow pan left" 或 "horizontal pan from right to left"
- 禁止使用其他類型的運鏡（dolly、tilt、orbit 等）`,
      en: `## Camera Motion Restriction: Pan Left
User selected "Pan Left" camera mode:
- All scenes use horizontal pan from right to left
- Add "slow pan left" or "horizontal pan from right to left" in each visualPrompt
- Do NOT use other camera movements (dolly, tilt, orbit, etc.)`,
    },
    tilt_up: {
      zh: `## 運鏡限制：由下往上
用戶選擇了「由下往上」運鏡模式：
- 所有場景使用從下往上的垂直傾斜運鏡（tilt up）
- 在每個 visualPrompt 中加入 "slow tilt up" 或 "vertical tilt from bottom to top"
- 禁止使用其他類型的運鏡（dolly、pan、tilt down、orbit 等）`,
      en: `## Camera Motion Restriction: Tilt Up
User selected "Tilt Up" camera mode:
- All scenes use bottom-to-top vertical tilt movement (tilt up)
- Add "slow tilt up" or "vertical tilt from bottom to top" in each visualPrompt
- Do NOT use other camera movements (dolly, pan, tilt down, orbit, etc.)`,
    },
    tilt_down: {
      zh: `## 運鏡限制：由上往下
用戶選擇了「由上往下」運鏡模式：
- 所有場景使用從上往下的垂直傾斜運鏡（tilt down）
- 在每個 visualPrompt 中加入 "slow tilt down" 或 "vertical tilt from top to bottom"
- 禁止使用其他類型的運鏡（dolly、pan、tilt up、orbit 等）`,
      en: `## Camera Motion Restriction: Tilt Down
User selected "Tilt Down" camera mode:
- All scenes use top-to-bottom vertical tilt movement (tilt down)
- Add "slow tilt down" or "vertical tilt from top to bottom" in each visualPrompt
- Do NOT use other camera movements (dolly, pan, tilt up, orbit, etc.)`,
    },
  };

  return instructions[motion][locale === "en" ? "en" : "zh"];
}

// ============ Prompt Export for External Platforms ============

export interface ExportableScript {
  title: string;
  concept: string;
  style: string;
  totalDuration: number;
  ratio: string;
  scenes: Array<{
    sceneNumber: number;
    startTime: number;
    endTime: number;
    duration: number;
    description: string;
    visualPrompt: string;
    cameraMovement?: string;
    lighting?: string;
    transition?: string;
  }>;
  musicStyle?: string;
  colorGrading?: string;
  consistencyMode?: ConsistencyMode;
  motionDynamics?: MotionDynamics;
  qualityBooster?: QualityBooster;
}

/**
 * Export script as formatted text for use with other AI video platforms
 */
export function exportScriptAsText(script: ExportableScript): string {
  const lines: string[] = [];

  // Header
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push(`📽️ ${script.title}`);
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("");

  // Overview
  lines.push("【影片概要】");
  lines.push(`概念：${script.concept}`);
  lines.push(`風格：${script.style}`);
  lines.push(`時長：${script.totalDuration} 秒`);
  lines.push(`比例：${script.ratio}`);
  if (script.consistencyMode && script.consistencyMode !== "none") {
    const modeLabels: Record<string, string> = {
      product: "產品一致性",
      character: "人物一致性",
      both: "完全一致性",
    };
    lines.push(`一致性：${modeLabels[script.consistencyMode]}`);
  }
  if (script.motionDynamics) {
    const dynamicsLabels: Record<string, string> = {
      subtle: "微妙動態",
      moderate: "中等動態",
      dramatic: "劇烈動態",
    };
    lines.push(`動態程度：${dynamicsLabels[script.motionDynamics]}`);
  }
  if (script.qualityBooster && script.qualityBooster !== "none") {
    const boosterLabels: Record<string, string> = {
      commercial: "商業級製作",
      cinematic: "電影級視覺",
      luxury: "奢侈品美學",
      editorial: "編輯級時尚",
      documentary: "紀錄片真實感",
      artistic: "藝術感視覺",
    };
    lines.push(`品質增強：${boosterLabels[script.qualityBooster]}`);
  }
  lines.push("");

  // Scenes
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("【分場 Prompts】");
  lines.push("───────────────────────────────────────────────────────────");

  for (const scene of script.scenes) {
    lines.push("");
    lines.push(`▎場景 ${scene.sceneNumber}  [${formatTimeCode(scene.startTime)} - ${formatTimeCode(scene.endTime)}]  ${scene.duration}秒`);
    lines.push(`描述：${scene.description}`);
    if (scene.cameraMovement) {
      lines.push(`運鏡：${scene.cameraMovement}`);
    }
    if (scene.lighting) {
      lines.push(`光影：${scene.lighting}`);
    }
    lines.push("");
    lines.push("📋 Prompt:");
    lines.push("┌─────────────────────────────────────────────────────────┐");
    // Wrap long prompts
    const wrappedPrompt = wrapText(scene.visualPrompt, 55);
    for (const line of wrappedPrompt) {
      lines.push(`│ ${line.padEnd(55)} │`);
    }
    lines.push("└─────────────────────────────────────────────────────────┘");
  }

  // Additional Info
  if (script.musicStyle || script.colorGrading) {
    lines.push("");
    lines.push("───────────────────────────────────────────────────────────");
    lines.push("【製作建議】");
    if (script.musicStyle) {
      lines.push(`配樂風格：${script.musicStyle}`);
    }
    if (script.colorGrading) {
      lines.push(`調色風格：${script.colorGrading}`);
    }
  }

  // Footer
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("💡 使用提示：複製上方 Prompt 到 Runway、Pika、Kling 等平台");
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Export script as Markdown format
 */
export function exportScriptAsMarkdown(script: ExportableScript): string {
  const lines: string[] = [];

  // Header
  lines.push(`# 📽️ ${script.title}`);
  lines.push("");

  // Overview
  lines.push("## 影片概要");
  lines.push("");
  lines.push(`| 項目 | 內容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 概念 | ${script.concept} |`);
  lines.push(`| 風格 | ${script.style} |`);
  lines.push(`| 時長 | ${script.totalDuration} 秒 |`);
  lines.push(`| 比例 | ${script.ratio} |`);
  if (script.consistencyMode && script.consistencyMode !== "none") {
    const modeLabels: Record<string, string> = {
      product: "產品一致性",
      character: "人物一致性",
      both: "完全一致性",
    };
    lines.push(`| 一致性 | ${modeLabels[script.consistencyMode]} |`);
  }
  lines.push("");

  // Scenes
  lines.push("## 分場 Prompts");
  lines.push("");

  for (const scene of script.scenes) {
    lines.push(`### 場景 ${scene.sceneNumber} \`${formatTimeCode(scene.startTime)} - ${formatTimeCode(scene.endTime)}\` (${scene.duration}秒)`);
    lines.push("");
    lines.push(`**描述：** ${scene.description}`);
    if (scene.cameraMovement) {
      lines.push(`**運鏡：** ${scene.cameraMovement}`);
    }
    if (scene.lighting) {
      lines.push(`**光影：** ${scene.lighting}`);
    }
    lines.push("");
    lines.push("**Prompt:**");
    lines.push("```");
    lines.push(scene.visualPrompt);
    lines.push("```");
    lines.push("");
  }

  // Additional Info
  if (script.musicStyle || script.colorGrading) {
    lines.push("## 製作建議");
    lines.push("");
    if (script.musicStyle) {
      lines.push(`- **配樂風格：** ${script.musicStyle}`);
    }
    if (script.colorGrading) {
      lines.push(`- **調色風格：** ${script.colorGrading}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("*💡 使用提示：複製上方 Prompt 到 Runway、Pika、Kling 等平台*");

  return lines.join("\n");
}

/**
 * Export only the prompts (simple format for quick copy)
 */
export function exportPromptsOnly(script: ExportableScript): string {
  const lines: string[] = [];

  lines.push(`# ${script.title} - Prompts`);
  lines.push("");

  for (const scene of script.scenes) {
    lines.push(`## Scene ${scene.sceneNumber} (${scene.duration}s)`);
    lines.push(scene.visualPrompt);
    lines.push("");
  }

  return lines.join("\n");
}

// Helper functions
function formatTimeCode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [""];
}

// ============ Enhanced Extension Prompt (Veo 3.1 Optimized) ============

/**
 * Build enhanced extension prompt with visual consistency hints
 * Optimized for Veo 3.1's reference image and multi-shot capabilities
 * Uses imageAnalysis data to maintain visual consistency across video segments
 */
export function buildEnhancedExtensionPrompt(
  basePrompt: string,
  imageAnalysis?: {
    subjects?: string[];
    subjectDetails?: {
      type?: string;
      appearance?: string;
    };
    colors?: string[];
    colorTemperature?: string;
    mood?: string;
    setting?: string;
    lighting?: {
      type?: string;
      direction?: string;
      quality?: string;
    };
    texture?: string;
  },
  consistencyMode?: ConsistencyMode,
  lastFrameDescription?: string
): string {
  const consistencyHints: string[] = [];

  // Veo 3.1 optimized consistency prefix
  consistencyHints.push("CRITICAL VISUAL CONTINUITY REQUIREMENTS:");
  consistencyHints.push("This is a video extension - seamlessly continue from the previous segment's last frame.");

  // Add last frame description if available (Veo 3.1 best practice)
  if (lastFrameDescription) {
    consistencyHints.push("");
    consistencyHints.push(`LAST FRAME STATE: ${lastFrameDescription}`);
    consistencyHints.push("The extension MUST start exactly from this visual state.");
  }

  // Add subject consistency hints from imageAnalysis
  if (imageAnalysis) {
    consistencyHints.push("");
    consistencyHints.push("VISUAL ELEMENTS TO PRESERVE:");

    if (imageAnalysis.subjects && imageAnalysis.subjects.length > 0) {
      consistencyHints.push(
        `• Subjects: ${imageAnalysis.subjects.join(", ")} - must appear IDENTICAL`
      );
    }

    // Enhanced: Add detailed subject appearance with Veo 3.1 specific format
    if (imageAnalysis.subjectDetails?.appearance) {
      consistencyHints.push(
        `• Subject Details: ${imageAnalysis.subjectDetails.appearance} - NO changes allowed`
      );
    }

    if (imageAnalysis.colors && imageAnalysis.colors.length > 0) {
      consistencyHints.push(
        `• EXACT Color Palette: ${imageAnalysis.colors.join(", ")} - maintain precisely`
      );
    }

    // Enhanced: Add color temperature with Veo 3.1 vocabulary
    if (imageAnalysis.colorTemperature) {
      const tempMapping: Record<string, string> = {
        warm: "warm tones, orange-yellow cast",
        cool: "cool tones, blue cast",
        neutral: "neutral balanced tones",
      };
      consistencyHints.push(
        `• Color Temperature: ${tempMapping[imageAnalysis.colorTemperature] || imageAnalysis.colorTemperature} throughout`
      );
    }

    if (imageAnalysis.mood) {
      consistencyHints.push(
        `• Mood/Atmosphere: ${imageAnalysis.mood} - maintain emotional consistency`
      );
    }

    if (imageAnalysis.setting) {
      consistencyHints.push(
        `• Setting: ${imageAnalysis.setting} - same environment`
      );
    }

    // Enhanced: Add lighting consistency with Veo 3.1 specific terms
    if (imageAnalysis.lighting) {
      const lightingParts = [
        imageAnalysis.lighting.quality,
        imageAnalysis.lighting.type ? `${imageAnalysis.lighting.type} light` : null,
        imageAnalysis.lighting.direction ? `from ${imageAnalysis.lighting.direction}` : null,
      ].filter(Boolean);

      if (lightingParts.length > 0) {
        consistencyHints.push(
          `• Lighting: ${lightingParts.join(", ")} - NO lighting changes`
        );
      }
    }

    // Enhanced: Add texture consistency
    if (imageAnalysis.texture) {
      consistencyHints.push(
        `• Material Texture: ${imageAnalysis.texture} - preserve surface qualities`
      );
    }
  }

  // Add mode-specific consistency instructions with Veo 3.1 optimized language
  if (consistencyMode && consistencyMode !== "none") {
    consistencyHints.push("");
    consistencyHints.push("STRICT CONSISTENCY MODE ACTIVE:");

    switch (consistencyMode) {
      case "product":
        consistencyHints.push(
          "• PRODUCT LOCK: The product must have IDENTICAL appearance across all frames"
        );
        consistencyHints.push(
          "  - Same exact shape, proportions, dimensions"
        );
        consistencyHints.push(
          "  - Same exact colors, materials, reflections"
        );
        consistencyHints.push(
          "  - Same exact brand elements, logos, text"
        );
        consistencyHints.push(
          "  - Same exact surface texture and finish"
        );
        break;
      case "character":
        consistencyHints.push(
          "• CHARACTER LOCK: The character must have IDENTICAL appearance across all frames"
        );
        consistencyHints.push(
          "  - Same exact facial features, expressions range"
        );
        consistencyHints.push(
          "  - Same exact hairstyle, hair color, hair length"
        );
        consistencyHints.push(
          "  - Same exact clothing, accessories, jewelry"
        );
        consistencyHints.push(
          "  - Same exact body type, skin tone, posture"
        );
        break;
      case "both":
        consistencyHints.push(
          "• FULL LOCK: Both product AND character must maintain IDENTICAL appearance"
        );
        consistencyHints.push(
          "  - Product: exact shape, color, texture, branding"
        );
        consistencyHints.push(
          "  - Character: exact face, hair, clothing, body"
        );
        consistencyHints.push(
          "  - NO variations allowed on either element"
        );
        break;
    }
  }

  // Veo 3.1 specific transition instructions
  consistencyHints.push("");
  consistencyHints.push("TRANSITION REQUIREMENTS:");
  consistencyHints.push("• Camera position must continue smoothly from previous segment");
  consistencyHints.push("• No sudden jumps in subject position or scale");
  consistencyHints.push("• Maintain same depth of field and focus point");
  consistencyHints.push("• Continue the same motion trajectory and speed");

  // Combine hints with base prompt using Veo 3.1 optimized format
  const enhancedPrompt = [
    ...consistencyHints,
    "",
    "═══════════════════════════════════════",
    "EXTENSION PROMPT:",
    basePrompt,
    "═══════════════════════════════════════",
  ].join("\n");

  return enhancedPrompt;
}

/**
 * Build a last frame description for better extension consistency
 * This helps Veo 3.1 understand exactly where to continue from
 */
export function buildLastFrameDescription(
  sceneDescription: string,
  cameraPosition?: string,
  subjectState?: string,
  lightingState?: string
): string {
  const parts: string[] = [];

  if (subjectState) {
    parts.push(`Subject state: ${subjectState}`);
  }

  if (cameraPosition) {
    parts.push(`Camera position: ${cameraPosition}`);
  }

  if (lightingState) {
    parts.push(`Lighting: ${lightingState}`);
  }

  parts.push(`Scene: ${sceneDescription}`);

  return parts.join(". ");
}