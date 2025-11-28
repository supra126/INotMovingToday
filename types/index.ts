// ============ 基礎類型 ============

export type VideoRatio = "9:16" | "16:9" | "1:1";

export type VideoPlatform = "reels" | "shorts" | "tiktok";

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

export interface ImageAnalysis {
  subjects: string[];
  mood: string;
  colors: string[];
  setting: string;
  suggestedThemes: string[];
}

// ============ 影片方向建議 ============

export interface VideoSuggestion {
  id: string;
  title: string; // 簡短標題（5-10字）
  concept: string; // 概念描述（50-100字）
  style: VideoStyle;
  targetPlatform: VideoPlatform;
  estimatedDuration: number; // 秒數（15/30/60）

  // 初步規劃
  hookIdea: string; // 開頭吸睛點
  mainContent: string; // 主要內容描述
  callToAction: string; // 結尾行動呼籲

  // 視覺建議
  visualStyle: string;
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
  additionalImages?: UploadedImage[];
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
  visualPrompt: string;
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

  finalSpec?: FinalVideoSpec;
  generatedVideoUrl?: string;
}

// ============ API 回應類型 ============

export interface AnalysisResponse {
  imageAnalysis: ImageAnalysis;
  suggestions: [VideoSuggestion, VideoSuggestion, VideoSuggestion];
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
