import type { Locale, PromptFieldKey, PromptFields, VideoGenerationMode, VideoRatio } from "@/types";

export const PROMPT_FIELD_KEYS: PromptFieldKey[] = ["subject", "setting", "camera", "lighting", "sound"];

export interface PromptContext {
  imageCount: number;
  mode: VideoGenerationMode;
  ratio: VideoRatio;
  duration: number;
  locale: Locale;
}

export interface PromptDraftInput extends PromptContext {
  /** What the user wants, in their own words (may be empty) */
  description: string;
}

const MODE_GUIDANCE: Record<VideoGenerationMode, string> = {
  single_image:
    "The first image is the opening frame. Animate it: the subject must stay exactly as it looks (shape, colour, logo, label, materials). Extra images, if any, are references for elements to bring into the shot.",
  frames_to_video:
    "Two images are provided: the opening frame and the final frame. The shot is a smooth, believable transition from the first to the second.",
  text_only: "No image is provided. Describe the subject and scene completely so the video can be generated from text alone.",
};

const FIELD_GUIDE = [
  "- subject: the subject and what it does (the motion)",
  "- setting: the environment and background",
  "- camera: camera movement and framing, in plain words",
  "- lighting: lighting and mood",
  "- sound: ambience, music or sound effects",
].join("\n");

function contextLines(ctx: PromptContext): string[] {
  const orientation = ctx.ratio === "9:16" ? "vertical 9:16" : "horizontal 16:9";
  return [
    `- Images provided: ${ctx.imageCount}`,
    `- ${MODE_GUIDANCE[ctx.mode]}`,
    `- Format: ${orientation}, ${ctx.duration} seconds. Keep the amount of action realistic for that length.`,
  ];
}

function languageName(locale: Locale): string {
  return locale === "zh" ? "Traditional Chinese (Taiwan)" : "English";
}

/**
 * Step 1: turn the user's idea (+ images) into editable shot fields with alternatives.
 * The app is for product shots and short motion clips that are edited elsewhere,
 * so it describes a single continuous shot — no titles, captions or story.
 */
export function buildPromptDraftPrompt(input: PromptDraftInput): string {
  const lang = languageName(input.locale);
  return [
    "You help write video prompts for Google Gemini Omni Flash.",
    "The user makes short motion clips, mostly product shots, that are cut together in another editor.",
    "Plan ONE continuous shot. No titles, captions, on-screen text, scene lists, hooks or calls to action.",
    "",
    "Context:",
    ...contextLines(input),
    "",
    input.description.trim()
      ? `User's idea: ${input.description.trim()}`
      : "The user gave no description: propose a tasteful, commercial-looking motion based on the image(s).",
    "",
    `Fill these fields in ${lang}. Each "value" is one or two concrete, visual sentences.`,
    FIELD_GUIDE,
    `For each field also give "options": 3 short alternative values in ${lang}, clearly different from each other and from "value".`,
    `Also write "summary": one short sentence in ${lang} describing the whole shot.`,
    "Refer to uploaded images naturally (\"the product in the image\"). Do not invent brand names or text.",
    "",
    "Return JSON only, shaped like:",
    '{"summary": "...", "fields": {"subject": {"value": "...", "options": ["...", "...", "..."]}, "setting": {...}, "camera": {...}, "lighting": {...}, "sound": {...}}}',
  ].join("\n");
}

/**
 * Step 2: compose the (possibly edited) fields into the final English Omni prompt
 */
export function buildPromptComposePrompt(fields: PromptFields, ctx: PromptContext): string {
  const fieldText = PROMPT_FIELD_KEYS.filter((key) => fields[key]?.trim())
    .map((key) => `- ${key}: ${fields[key].trim()}`)
    .join("\n");

  return [
    "Write the final video prompt for Google Gemini Omni Flash from the shot plan below.",
    "",
    "Context:",
    ...contextLines(ctx),
    "",
    "Shot plan (may be in any language; the user may have edited it):",
    fieldText,
    "",
    "Rules:",
    "- English only, 3 to 5 natural sentences, about 50-90 words, one continuous shot.",
    "- Keep every detail the user wrote; translate faithfully, do not add new subjects.",
    "- Order: subject and motion, setting, camera, lighting and mood, sound.",
    "- No keyword lists, no \"4K, masterpiece\" style tags, no negatives, no on-screen text.",
    "",
    'Return JSON only: {"prompt": "..."}',
  ].join("\n");
}
