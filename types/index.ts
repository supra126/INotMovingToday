// ============ 基礎類型 ============

export type VideoRatio = "9:16" | "16:9";

export type VideoResolution = "360p" | "720p" | "1080p" | "4k";

// 影片長度選項（Omni 1.2 單段 3-15 秒；首尾幀與延伸每段最多 10 秒）
export type VideoDuration = 4 | 6 | 8 | 10 | 12 | 15;

// 影片生成模式（依上傳的圖片自動判斷）
export type VideoGenerationMode =
  | "single_image"      // 主圖生成（1 張=起始畫面，2-3 張=加參考圖）
  | "frames_to_video"   // 首尾幀轉場（主圖 + 結束畫面）
  | "text_only";        // 純文字生成（不使用圖片）

// 影片音訊：只有音效、音效加背景音樂，或無聲（生成後拿掉音軌）
export type AudioMode = "sfx" | "sfx_music" | "none";

// 分鏡圖尺寸（Nano Banana）
export type ImageSize = "1K" | "2K" | "4K";

export type Locale = "zh" | "en";

// ============ 上傳的素材 ============

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  uploadedAt: number;
  order: number;
}

// ============ 提示詞 ============

/** Aspects of the shot the user can review and edit */
export type PromptFieldKey = "subject" | "setting" | "camera" | "lighting" | "sound";

export type PromptFields = Record<PromptFieldKey, string>;

/** AI suggestion for one field: the proposed value plus alternatives to pick from */
export interface PromptFieldSuggestion {
  value: string;
  options: string[];
}

export interface PromptDraft {
  /** One-line description of the shot in the user's language */
  summary: string;
  fields: Record<PromptFieldKey, PromptFieldSuggestion>;
}
