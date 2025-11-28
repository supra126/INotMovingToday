import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import type { AnalysisResponse, Locale } from "@/types";
import { buildInitialPrompt, buildRefinementPrompt } from "./prompts";

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

  private async fileToGenerativePart(file: File): Promise<Part> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      inlineData: {
        mimeType: file.type,
        data: base64,
      },
    };
  }

  async analyzeImages(
    images: File[],
    description: string,
    locale: Locale = "zh"
  ): Promise<AnalysisResponse> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const prompt = buildInitialPrompt(images.length, description, locale);

    const imageParts = await Promise.all(
      images.map((img) => this.fileToGenerativePart(img))
    );

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]) as AnalysisResponse;

      // Add IDs to suggestions if not present
      parsed.suggestions = parsed.suggestions.map((s, i) => ({
        ...s,
        id: s.id || `suggestion-${Date.now()}-${i}`,
      })) as [typeof parsed.suggestions[0], typeof parsed.suggestions[1], typeof parsed.suggestions[2]];

      return parsed;
    } catch {
      console.error("Failed to parse AI response:", text);
      throw new Error("Failed to parse AI analysis response");
    }
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
    locale: Locale = "zh"
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
      locale
    );

    const imageParts = await Promise.all(
      images.map((img) => this.fileToGenerativePart(img))
    );

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]) as AnalysisResponse;

      parsed.suggestions = parsed.suggestions.map((s, i) => ({
        ...s,
        id: s.id || `suggestion-${Date.now()}-${i}`,
      })) as [typeof parsed.suggestions[0], typeof parsed.suggestions[1], typeof parsed.suggestions[2]];

      return parsed;
    } catch {
      console.error("Failed to parse AI response:", text);
      throw new Error("Failed to parse AI refinement response");
    }
  }
}

// Singleton for client-side usage with user-provided API key
let clientInstance: GeminiClient | null = null;

export function getGeminiClient(apiKey: string): GeminiClient {
  if (!clientInstance || clientInstance !== null) {
    clientInstance = new GeminiClient({ apiKey });
  }
  return clientInstance;
}

export function createGeminiClient(apiKey: string): GeminiClient {
  return new GeminiClient({ apiKey });
}
