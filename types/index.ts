// ============ 基礎類型 ============

export type VideoRatio = "9:16" | "16:9" | "1:1";

export type VideoResolution = "720p" | "1080p";

// Veo 模型選擇
export type VeoModel = "fast" | "standard";

// 影片長度選項
export type VideoDuration = 4 | 6 | 8;

// 運鏡效果
export type CameraMotion =
  | "auto"       // 智慧運鏡：AI 根據內容自動選擇
  | "static"     // 靜止：固定鏡頭
  | "push"       // 推進：向主體推近
  | "pull"       // 拉遠：遠離主體
  | "pan_right"  // 右平移：從左到右水平移動
  | "pan_left"   // 左平移：從右到左水平移動
  | "tilt";      // 傾斜：垂直移動

// 圖片使用位置
export type ImageUsageMode =
  | "start"   // 影片開頭使用圖片 (Image-to-Video)
  | "none";   // 不使用圖片（純文字生成）

// 視覺一致性模式
export type ConsistencyMode =
  | "none"       // 不強調一致性，讓 AI 自由發揮
  | "product"    // 產品一致性（顏色、形狀、品牌特徵）
  | "character"  // 人物一致性（外貌、服裝、特徵）
  | "both";      // 同時強調產品和人物一致性

// 場景模式
export type SceneMode =
  | "auto"       // 自動：根據時長智慧決定（≤8秒單場景，>8秒多場景）
  | "single"     // 單場景：強制單一連續鏡頭（最長 8 秒，最佳一致性）
  | "multi";     // 多場景：傳統多場景模式（適合故事敘述）

// 動態程度 (Veo 3.1 優化)
export type MotionDynamics =
  | "subtle"     // 微妙：適合產品展示、氛圍營造
  | "moderate"   // 中等：適合生活場景、人物互動
  | "dramatic";  // 劇烈：適合運動、動作場景

// 品質增強器 (Veo 3.1 優化)
export type QualityBooster =
  | "none"        // 不使用增強
  | "commercial"  // 商業級製作
  | "cinematic"   // 電影級視覺
  | "luxury"      // 奢侈品美學
  | "editorial"   // 編輯級時尚
  | "documentary" // 紀錄片真實感
  | "artistic";   // 藝術感視覺

export type VideoPlatform = "reels" | "shorts" | "tiktok" | "youtube";

export type VideoStyle =
  | "cinematic" // 電影感
  | "dynamic" // 動感剪輯
  | "storytelling" // 敘事型
  | "product-demo" // 產品展示
  | "tutorial" // 教學型
  | "aesthetic" // 美感氛圍
  | "meme"; // 迷因/趣味

export type Locale = "zh" | "en";

// ============ 上傳的素材 ============

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  uploadedAt: number;
  order: number;
}

export interface UserInput {
  images: UploadedImage[]; // 最多 3 張
  description: string;
  additionalNotes?: string;
}

// ============ AI 分析結果 ============

export interface SubjectDetails {
  type: "product" | "person" | "animal" | "object" | "scene";
  position: "center" | "left" | "right" | "foreground" | "background";
  scale: "close-up" | "medium" | "full" | "wide";
  appearance: string; // 外觀特徵描述
}

export interface LightingAnalysis {
  type: "natural" | "studio" | "mixed";
  direction: "front" | "side" | "back" | "top" | "ambient";
  quality: "soft" | "hard" | "diffused" | "dramatic";
}

export interface ImageAnalysis {
  subjects: string[];
  subjectDetails?: SubjectDetails;
  mood: string;
  colors: string[];
  colorTemperature?: "warm" | "cool" | "neutral";
  setting: string;
  lighting?: LightingAnalysis;
  texture?: string; // 材質質感
  suggestedThemes: string[];
}

// AI 建議的設定（根據圖片分析自動推薦）
export interface RecommendedSettings {
  consistencyMode: ConsistencyMode;
  motionDynamics: MotionDynamics;
  qualityBooster: QualityBooster;
  reasoning?: string; // AI 推薦理由（可選）
}

// ============ 視覺方向 ============

export interface VisualDirection {
  subjectAction: string;    // 主體與動作概述
  environment: string;      // 環境與背景基調
  cameraStyle: string;      // 整體運鏡風格
  lightingMood: string;     // 光影氛圍
  videoAesthetic: string;   // 影片質感
}

// ============ 影片方向建議 ============

export interface VideoSuggestion {
  id: string;
  title: string; // 簡短標題（5-10字）
  concept: string; // 概念描述（50-100字）
  style: VideoStyle;
  targetPlatform: VideoPlatform;
  estimatedDuration: number; // 秒數（預設 8 秒）

  // 初步規劃
  hookIdea: string; // 開頭吸睛點
  mainContent: string; // 主要內容描述
  callToAction: string; // 結尾行動呼籲

  // 視覺方向（整體風格）
  visualDirection: VisualDirection;

  // 其他建議
  transitionStyle: string;
  suggestedMusic: string;
}

export interface SuggestionSet {
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

export interface UserSelection {
  suggestionId: string;
  adjustment?: string;
  additionalText?: string;
}

// ============ 迭代歷史 ============

export interface IterationRecord {
  round: number;
  suggestionSet: SuggestionSet;
  userSelection: UserSelection;
}

// ============ 最終影片規劃 ============

export interface SceneScript {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  description: string;

  // 視覺細節（用於生成 prompt）
  subjectAction: string;      // 主體與動作
  environment: string;        // 環境與背景
  cameraMovement: string;     // 運鏡方式
  lighting: string;           // 光影設定
  aesthetic: string;          // 質感描述

  // 生成用
  visualPrompt: string;       // 組合後的完整 prompt
  textOverlay?: string;
  transition: string;
}

export interface VideoScript {
  scenes: SceneScript[];
  totalDuration: number;
  voiceoverText?: string;
}

export interface FinalVideoSpec {
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

export type CreationPhase =
  | "initial-upload"
  | "analyzing"
  | "first-suggestions"
  | "refining"
  | "final-review"
  | "generating-script"
  | "generating"
  | "completed";

export interface CreationSession {
  id: string;
  phase: CreationPhase;
  startedAt: number;

  images: UploadedImage[];
  description: string;
  iterations: IterationRecord[];
  currentSuggestions?: SuggestionSet;
  imageAnalysis?: ImageAnalysis;
  recommendedSettings?: RecommendedSettings; // AI 根據圖片分析推薦的設定

  finalSpec?: FinalVideoSpec;
  generatedVideoUrl?: string;
}

// ============ API 回應類型 ============

export interface AnalysisResponse {
  imageAnalysis: ImageAnalysis;
  suggestions: [VideoSuggestion, VideoSuggestion, VideoSuggestion];
  recommendedSettings?: RecommendedSettings; // AI 根據圖片分析推薦的設定
}

export interface ScriptResponse {
  script: VideoScript;
  musicRecommendation: {
    style: string;
    tempo: string;
    mood: string;
  };
  colorGrading: string;
}

export interface GenerationResponse {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
}

// ============ 影片生成 Provider ============

export interface GenerationParams {
  prompt: string;
  duration: number;
  ratio: VideoRatio;
  referenceImages?: string[]; // base64 或 URL
  style?: string;
}

export interface GenerationResult {
  jobId: string;
  estimatedTime: number;
}

export interface JobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export interface ProviderCapabilities {
  maxDuration: number;
  supportedRatios: VideoRatio[];
  supportsReferenceImage: boolean;
  supportsTextOverlay: boolean;
}

export interface VideoGenerationProvider {
  name: string;
  generateVideo(params: GenerationParams): Promise<GenerationResult>;
  checkStatus(jobId: string): Promise<JobStatus>;
  getCapabilities(): ProviderCapabilities;
}

// ============ API Key 設定 ============

export interface ApiKeyConfig {
  geminiApiKey?: string;
  runwayApiKey?: string;
  pikaApiKey?: string;
  klingApiKey?: string;
}

// ============ 錯誤類型 ============

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
