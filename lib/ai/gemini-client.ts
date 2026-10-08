import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import type { PromptDraft, PromptFields } from "@/types";
import {
  PROMPT_FIELD_KEYS,
  buildPromptDraftPrompt,
  buildPromptComposePrompt,
  type PromptContext,
  type PromptDraftInput,
} from "./prompts";
import { geminiLogger as logger } from "@/lib/logger";

const MODEL_NAME = "gemini-3.8-flash";

// Thinking tokens count toward this limit, so leave headroom for the JSON output
const MAX_OUTPUT_TOKENS = 32768;

export type GeminiThinkingLevel = "low" | "medium" | "high";

const THINKING_LEVELS: Record<GeminiThinkingLevel, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

/**
 * Parse a thinking level from env / user input, falling back to the model default (undefined)
 */
export function parseThinkingLevel(value: string | undefined): GeminiThinkingLevel | undefined {
  const level = value?.trim().toLowerCase();
  return level === "low" || level === "medium" || level === "high" ? level : undefined;
}

export interface GeminiClientOptions {
  apiKey: string;
  /** Gemini 3 thinking level; omitted = model default (medium) */
  thinkingLevel?: GeminiThinkingLevel;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private thinkingLevel?: GeminiThinkingLevel;

  constructor(options: GeminiClientOptions) {
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.thinkingLevel = options.thinkingLevel;
  }

  /**
   * Run a JSON-mode generation and return the raw response text.
   * Gemini 3 recommends the default temperature, so sampling params are not overridden.
   */
  private async generateJson(
    prompt: string,
    imageParts: Part[] = [],
    thinkingLevel: GeminiThinkingLevel | undefined = this.thinkingLevel
  ): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        ...(thinkingLevel && {
          thinkingConfig: { thinkingLevel: THINKING_LEVELS[thinkingLevel] },
        }),
      },
    });

    const text = response.text;
    if (!text) {
      const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason;
      throw new Error(`Empty response from Gemini${reason ? ` (${reason})` : ""}`);
    }
    return text;
  }

  // Supported MIME types by Gemini API
  private static SUPPORTED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  private async fileToGenerativePart(file: File): Promise<Part> {
    let mimeType = file.type;
    let arrayBuffer = await file.arrayBuffer();

    // Check if the MIME type is supported
    if (!GeminiClient.SUPPORTED_MIME_TYPES.includes(mimeType)) {
      logger.info(`Unsupported MIME type: ${mimeType}, converting to JPEG`);

      // For unsupported formats (like AVIF), convert to JPEG using canvas
      // This only works in browser environment
      if (typeof document !== "undefined" && typeof createImageBitmap !== "undefined") {
        try {
          const blob = new Blob([arrayBuffer], { type: mimeType });
          const imageBitmap = await createImageBitmap(blob);

          const canvas = document.createElement("canvas");
          canvas.width = imageBitmap.width;
          canvas.height = imageBitmap.height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(imageBitmap, 0, 0);
            const jpegBlob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9);
            });
            arrayBuffer = await jpegBlob.arrayBuffer();
            mimeType = "image/jpeg";
            logger.debug(`Converted to JPEG, new size: ${arrayBuffer.byteLength}`);
          }
        } catch (err) {
          logger.error("Failed to convert image:", err);
          // Fall back to original, might fail but let API handle it
        }
      } else {
        // In Node.js environment, we can't easily convert images
        // Fall back to JPEG mime type and hope the content is compatible
        // Or throw a more helpful error
        logger.warn(`Cannot convert ${mimeType} in server environment. Please use JPEG, PNG, GIF, or WebP images.`);
        // Try to use as-is but with a common mime type
        mimeType = "image/jpeg";
      }
    }

    let base64: string;

    // Check if we're in Node.js environment (Server Actions)
    if (typeof Buffer !== "undefined") {
      // Node.js environment
      base64 = Buffer.from(arrayBuffer).toString("base64");
    } else {
      // Browser environment
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }

    return {
      inlineData: {
        mimeType,
        data: base64,
      },
    };
  }

  /**
   * Suggest editable shot fields (subject, setting, camera, lighting, sound) from the user's idea and images
   */
  async draftPrompt(images: File[], input: Omit<PromptDraftInput, "imageCount">): Promise<PromptDraft> {
    const prompt = buildPromptDraftPrompt({ ...input, imageCount: images.length });
    const imageParts = await Promise.all(images.map((img) => this.fileToGenerativePart(img)));
    const text = await this.generateJson(prompt, imageParts);

    const parsed = this.parse<{ summary?: string; fields?: Partial<Record<string, { value?: string; options?: unknown }>> }>(text);
    const fields = {} as PromptDraft["fields"];
    for (const key of PROMPT_FIELD_KEYS) {
      const field = parsed.fields?.[key];
      fields[key] = {
        value: field?.value?.trim() ?? "",
        options: Array.isArray(field?.options)
          ? field.options.filter((o): o is string => typeof o === "string" && o.trim() !== "").slice(0, 3)
          : [],
      };
    }
    if (!fields.subject.value) {
      throw new Error("Failed to parse AI response: missing subject");
    }
    return { summary: parsed.summary?.trim() ?? "", fields };
  }

  /**
   * Compose edited fields into the final English prompt for Omni (fast, low thinking)
   */
  async composePrompt(fields: PromptFields, ctx: PromptContext): Promise<string> {
    const text = await this.generateJson(buildPromptComposePrompt(fields, ctx), [], "low");
    const prompt = this.parse<{ prompt?: string }>(text).prompt?.trim();
    if (!prompt) {
      throw new Error("Failed to parse AI response: missing prompt");
    }
    return prompt;
  }

  private parse<T>(text: string): T {
    try {
      return GeminiClient.extractJson<T>(text);
    } catch (err) {
      logger.error("Failed to parse AI response:", text);
      throw new Error(`Failed to parse AI response: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  /**
   * Parse JSON from a JSON-mode response.
   * Falls back to extracting a fenced or embedded object in case the model wraps it.
   */
  private static extractJson<T>(text: string): T {
    try {
      return JSON.parse(text) as T;
    } catch {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1];
      const candidate = (fenced ?? text).match(/\{[\s\S]*\}/)?.[0];
      if (!candidate) {
        throw new Error("No JSON found in response");
      }
      return JSON.parse(candidate) as T;
    }
  }

}

// Singleton for client-side usage with user-provided API key
let clientInstance: GeminiClient | null = null;
let currentApiKey: string | null = null;

export function getGeminiClient(apiKey: string): GeminiClient {
  // Only create new instance if none exists or API key changed
  if (!clientInstance || currentApiKey !== apiKey) {
    clientInstance = new GeminiClient({ apiKey });
    currentApiKey = apiKey;
  }
  return clientInstance;
}

export function createGeminiClient(apiKey: string): GeminiClient {
  return new GeminiClient({ apiKey });
}
