import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import type { AnalysisResponse, Locale, ScriptResponse, VideoSuggestion, VideoRatio, ImageUsageMode, ConsistencyMode, SceneMode, MotionDynamics, QualityBooster } from "@/types";
import { buildInitialPrompt, buildRefinementPrompt, buildFinalScriptPrompt, buildScriptRefinementPrompt, getImageUsageInstruction, getConsistencyPromptSection, getSceneModeInstruction, getMotionDynamicsInstruction, getQualityBoosterInstruction } from "./prompts";
import { geminiLogger as logger } from "@/lib/logger";

const MODEL_NAME = "gemini-2.5-flash";

export interface GeminiClientOptions {
  apiKey: string;
  thinkingBudget?: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private thinkingBudget: number;

  constructor(options: GeminiClientOptions) {
    this.genAI = new GoogleGenerativeAI(options.apiKey);
    this.thinkingBudget = options.thinkingBudget ?? 2048;
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

  async analyzeImages(
    images: File[],
    description: string,
    locale: Locale = "zh",
    ratio: VideoRatio = "9:16"
  ): Promise<AnalysisResponse> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const prompt = buildInitialPrompt(images.length, description, locale, ratio);

    const imageParts = await Promise.all(
      images.map((img) => this.fileToGenerativePart(img))
    );

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    return this.parseAnalysisResponse(text, "analysis");
  }

  async refineWithSelection(
    images: File[],
    iterationNumber: number,
    previousSelection: {
      title: string;
      concept: string;
    },
    userAdjustment: string,
    newImageCount: number,
    additionalText: string,
    locale: Locale = "zh",
    ratio: VideoRatio = "9:16"
  ): Promise<AnalysisResponse> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const prompt = buildRefinementPrompt(
      iterationNumber,
      previousSelection,
      userAdjustment,
      newImageCount,
      additionalText,
      images.length,
      locale,
      ratio
    );

    const imageParts = await Promise.all(
      images.map((img) => this.fileToGenerativePart(img))
    );

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    return this.parseAnalysisResponse(text, "refinement");
  }

  async generateScript(
    images: File[],
    suggestion: VideoSuggestion,
    ratio: VideoRatio = "9:16",
    locale: Locale = "zh",
    imageUsageMode: ImageUsageMode = "start",
    consistencyMode: ConsistencyMode = "none",
    sceneMode: SceneMode = "auto",
    motionDynamics: MotionDynamics = "moderate",
    qualityBooster: QualityBooster = "none"
  ): Promise<ScriptResponse> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
      },
    });

    // Build image descriptions from analysis context
    const imageDescriptions = images.length > 0
      ? `${images.length} image(s) provided for reference`
      : "No reference images";

    // Get image usage instruction
    const imageUsageInstruction = getImageUsageInstruction(imageUsageMode, locale);

    // Get consistency prompt section
    const consistencySection = getConsistencyPromptSection(consistencyMode, locale);

    // Get scene mode instruction
    const sceneModeInstruction = getSceneModeInstruction(sceneMode, suggestion.estimatedDuration, locale);

    // Get motion dynamics instruction
    const motionDynamicsInstruction = getMotionDynamicsInstruction(motionDynamics, locale);

    // Get quality booster instruction
    const qualityBoosterInstruction = getQualityBoosterInstruction(qualityBooster, locale);

    const basePrompt = buildFinalScriptPrompt(
      suggestion.title,
      suggestion.concept,
      suggestion.style,
      suggestion.estimatedDuration,
      ratio,
      images.length,
      imageDescriptions,
      locale
    );

    // Combine prompts with additional instructions
    let prompt = basePrompt;
    if (imageUsageInstruction) {
      prompt += `\n\n${imageUsageInstruction}`;
    }
    if (consistencySection) {
      prompt += `\n\n${consistencySection}`;
    }
    if (sceneModeInstruction) {
      prompt += `\n\n${sceneModeInstruction}`;
    }
    if (motionDynamicsInstruction) {
      prompt += `\n\n${motionDynamicsInstruction}`;
    }
    if (qualityBoosterInstruction) {
      prompt += `\n\n${qualityBoosterInstruction}`;
    }

    const imageParts = await Promise.all(
      images.map((img) => this.fileToGenerativePart(img))
    );

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    return this.parseScriptResponse(text);
  }

  private parseAnalysisResponse(text: string, context: string): AnalysisResponse {
    try {
      // Remove markdown code blocks if present
      let cleanedText = text;

      // Remove ```json ... ``` or ``` ... ```
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }

      // Try to extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      let jsonStr = jsonMatch[0];

      // Fix common JSON issues from AI responses
      // 1. Remove trailing commas before } or ]
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
      // 2. Fix unquoted property names (simple cases)
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
      // 3. Remove any control characters that might break JSON
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, (char) => {
        if (char === "\n" || char === "\r" || char === "\t") return char;
        return "";
      });

      // Try to parse, if it fails try to fix common structural issues
      let parsed: AnalysisResponse;
      try {
        parsed = JSON.parse(jsonStr) as AnalysisResponse;
      } catch (parseError) {
        // Try to fix missing closing braces in nested objects
        // Count opening and closing braces
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;

        // Add missing closing braces/brackets
        let fixedJson = jsonStr;
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += "]";
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += "}";
        }

        // Remove trailing commas again after fixes
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, "$1");

        logger.info(`Attempting to fix JSON structure: added ${openBraces - closeBraces} braces, ${openBrackets - closeBrackets} brackets`);
        parsed = JSON.parse(fixedJson) as AnalysisResponse;
      }

      // Validate required fields
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error("Missing suggestions array in response");
      }

      // Ensure we have exactly 3 suggestions
      if (parsed.suggestions.length < 3) {
        throw new Error(`Expected 3 suggestions, got ${parsed.suggestions.length}`);
      }

      // Add IDs to suggestions if not present
      parsed.suggestions = parsed.suggestions.slice(0, 3).map((s, i) => ({
        ...s,
        id: s.id || `suggestion-${Date.now()}-${i}`,
      })) as [typeof parsed.suggestions[0], typeof parsed.suggestions[1], typeof parsed.suggestions[2]];

      // Ensure imageAnalysis exists
      if (!parsed.imageAnalysis) {
        parsed.imageAnalysis = {
          subjects: [],
          mood: "",
          colors: [],
          setting: "",
          suggestedThemes: [],
        };
      }

      return parsed;
    } catch (err) {
      logger.error(`Failed to parse AI ${context} response:`, text);
      logger.error("Parse error:", err);
      throw new Error(`Failed to parse AI ${context} response: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  private parseScriptResponse(text: string): ScriptResponse {
    try {
      // Remove markdown code blocks if present
      let cleanedText = text;

      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      let jsonStr = jsonMatch[0];

      // Fix common JSON issues from AI responses
      // 1. Remove trailing commas before } or ]
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
      // 2. Fix unquoted property names (simple cases)
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
      // 3. Remove any control characters that might break JSON
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, (char) => {
        if (char === "\n" || char === "\r" || char === "\t") return char;
        return "";
      });

      // Try to parse, if it fails try to fix common structural issues
      let parsed: ScriptResponse;
      try {
        parsed = JSON.parse(jsonStr) as ScriptResponse;
      } catch (parseError) {
        // Try to fix missing closing braces in nested objects
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;

        let fixedJson = jsonStr;
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += "]";
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += "}";
        }

        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, "$1");

        logger.info(`Attempting to fix JSON structure: added ${openBraces - closeBraces} braces, ${openBrackets - closeBrackets} brackets`);
        parsed = JSON.parse(fixedJson) as ScriptResponse;
      }

      // Validate required fields
      if (!parsed.script || !parsed.script.scenes) {
        throw new Error("Missing script or scenes in response");
      }

      // Ensure musicRecommendation exists
      if (!parsed.musicRecommendation) {
        parsed.musicRecommendation = {
          style: "upbeat",
          tempo: "120-140 BPM",
          mood: "energetic",
        };
      }

      // Ensure colorGrading exists
      if (!parsed.colorGrading) {
        parsed.colorGrading = "Natural with slight contrast boost";
      }

      return parsed;
    } catch (err) {
      logger.error("Failed to parse AI script response:", text);
      logger.error("Parse error:", err);
      throw new Error(`Failed to parse AI script response: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  /**
   * Refine an existing script based on user's adjustment instructions
   */
  async refineScript(
    currentScript: ScriptResponse,
    userAdjustment: string,
    locale: Locale = "zh"
  ): Promise<ScriptResponse> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-expect-error - thinkingConfig is not in types yet
        thinkingConfig: {
          thinkingBudget: this.thinkingBudget,
        },
      },
    });

    const prompt = buildScriptRefinementPrompt(
      JSON.stringify(currentScript, null, 2),
      userAdjustment,
      locale
    );

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return this.parseScriptResponse(text);
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
