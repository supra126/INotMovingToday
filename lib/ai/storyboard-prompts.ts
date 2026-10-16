import type { Locale, VideoRatio } from "@/types";
import type { ChatMessage, ScriptShot } from "@/lib/storyboard/types";

export interface ScriptContext {
  ratio: VideoRatio;
  tone: string;
  packagingText: string;
  locale: Locale;
  /** false = no product images: atmosphere B-roll without the product */
  hasProduct: boolean;
}

export interface ScriptResult {
  shots: ScriptShot[];
  suggestions: string[];
  /** Short message to the user about what changed */
  reply: string;
}

const MAX_SHOTS = 20;

// Rules from the ai-video storyboard skill
const SHARED_RULES = [
  "- Each shot is 3 to 10 seconds (video model limit). If the script wants a shorter shot, keep its intended length; it will be generated longer and trimmed in editing.",
  "- Keep lighting, setting and people consistent from shot to shot.",
  "- Write the sound effects for every shot. Music is \"無\" (none) unless the user asks for music in that shot; music is added in editing.",
  "- On-screen text (captions, titles) goes only in onScreenText. It is added in editing and must never be drawn in the picture.",
  "- Keep the user's core message and their on-screen text wording.",
];

function storyboardRules(hasProduct: boolean): string {
  const product = hasProduct
    ? [
        "- The first 2 seconds need a hook. The product must be clearly visible, and the last shot ends on the product: packaging large, facing the camera, still.",
        ...SHARED_RULES,
        "- Set hasPackaging to true when the product packaging is visible in the shot.",
      ]
    : [
        "- This is B-roll: atmosphere, scenes, textures and people that support the story. There are no product images, so never show a product, packaging or brand.",
        "- The first 2 seconds still need a visual hook.",
        ...SHARED_RULES,
        "- Set hasPackaging to false for every shot.",
      ];
  return product.join("\n");
}

const SHOT_SHAPE =
  '{"id": "s01", "seconds": 4, "visual": "...", "camera": "...", "sound": "...", "music": "無", "onScreenText": "...", "transition": "硬切", "hasPackaging": false}';

function languageName(locale: Locale): string {
  return locale === "zh" ? "Traditional Chinese (Taiwan)" : "English";
}

function contextLines(ctx: ScriptContext): string[] {
  const orientation = ctx.ratio === "9:16" ? "vertical 9:16" : "horizontal 16:9";
  return [
    `- Format: ${orientation} short video for Reels / Shorts, made of separate shots cut together in an editor.`,
    ctx.tone.trim() ? `- Tone: ${ctx.tone.trim()}` : "",
    ctx.packagingText.trim() ? `- Text printed on the packaging (must never change): ${ctx.packagingText.trim()}` : "",
  ].filter(Boolean);
}

function resultInstructions(locale: Locale): string[] {
  const lang = languageName(locale);
  return [
    `Write every field in ${lang}, except keep the user's on-screen text exactly as written.`,
    `"reply": one or two sentences in ${lang} telling the user what you did.`,
    `"suggestions": 2 to 5 short points in ${lang}: what you adjusted and why, or what the user should decide (e.g. who the model is).`,
    "Return JSON only, shaped like:",
    `{"reply": "...", "suggestions": ["..."], "shots": [${SHOT_SHAPE}]}`,
  ];
}

export function buildScriptParsePrompt(
  ctx: ScriptContext & { sourceText: string; hasSourceImage: boolean; productCount: number }
): string {
  const images: string[] = [];
  if (ctx.hasSourceImage) {
    images.push(
      "The first image is the user's script, usually a table where each row is a shot (what the picture shows, and the on-screen text). Read every row."
    );
  }
  if (ctx.productCount) {
    images.push(
      `The ${ctx.hasSourceImage ? "remaining" : ""} ${ctx.productCount > 1 ? "images are" : "image is"} the product.`.replace("  ", " ")
    );
  }
  return [
    "You are a short-video director turning a script into a shot-by-shot storyboard for an AI video model.",
    "",
    "Context:",
    ...contextLines(ctx),
    ...images.map((line) => `- ${line}`),
    "",
    ctx.sourceText.trim() ? `User's script or idea:\n${ctx.sourceText.trim()}` : "",
    "",
    "Turn it into a storyboard table and improve it without changing the core message. Rules:",
    storyboardRules(ctx.hasProduct),
    "",
    ...resultInstructions(ctx.locale),
  ].join("\n");
}

export function buildScriptRevisePrompt(
  ctx: ScriptContext & { shots: ScriptShot[]; chat: ChatMessage[]; message: string }
): string {
  const history = ctx.chat
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "You"}: ${m.text}`)
    .join("\n");
  return [
    "You are a short-video director editing a storyboard table with the user.",
    "",
    "Context:",
    ...contextLines(ctx),
    "",
    "Current storyboard (the user may have edited cells by hand; treat this as the latest version):",
    JSON.stringify(ctx.shots, null, 2),
    "",
    history ? `Conversation so far:\n${history}\n` : "",
    `User's request: ${ctx.message.trim()}`,
    "",
    "Apply the request and return the whole updated table in the new order. Keep shots the user did not mention unchanged.",
    "Ids identify shots: keep every existing shot's id even when shots are inserted, removed or reordered, and give each new shot an id that is not used yet (for example s06).",
    "Rules:",
    storyboardRules(ctx.hasProduct),
    "",
    ...resultInstructions(ctx.locale),
  ].join("\n");
}

// Prompts already written for other shots: new ones must describe recurring people the same way
function otherPromptLines(prompts?: Record<string, string>): string[] {
  const entries = Object.entries(prompts ?? {}).filter(([, prompt]) => prompt.trim());
  if (!entries.length) return [];
  return [
    "Prompts already used for other shots (describe recurring people, clothing and setting exactly as they do):",
    ...entries.map(([id, prompt]) => `- ${id}: ${prompt}`),
    "",
  ];
}

export function buildImagePromptsPrompt(ctx: ImagePromptsInput): string {
  return [
    "Write one English image prompt per shot for Nano Banana, to make the storyboard keyframe (the first frame of each shot).",
    "",
    "Context:",
    ...contextLines(ctx),
    ctx.hasProduct
      ? "- The product image(s) are attached only to shots whose hasPackaging is true: there, refer to \"the product\" rather than describing its label. Shots with hasPackaging false show no product or packaging."
      : "- B-roll without product images: show no product, packaging or brand.",
    "",
    "Storyboard:",
    JSON.stringify(ctx.shots, null, 2),
    "",
    ...otherPromptLines(ctx.existingPrompts),
    "Rules:",
    "- 2 to 4 sentences per shot: subject and pose, setting, camera framing and angle, lighting and color mood. A still frame, not motion.",
    "- Keep people, setting and lighting consistent across shots; describe a recurring person the same way every time.",
    "- No on-screen text, captions or logos other than what is printed on the product.",
    "",
    "Return JSON only, shaped like:",
    `{"prompts": {${ctx.shots.map((s) => `"${s.id}": "..."`).join(", ")}}}`,
  ].join("\n");
}

export function buildImagePromptRewritePrompt(ctx: ImagePromptRewriteInput): string {
  return [
    "Revise an English image prompt for a storyboard keyframe.",
    "",
    "Context:",
    ...contextLines(ctx),
    "",
    `Shot: ${JSON.stringify(ctx.shot)}`,
    `Current prompt: ${ctx.currentPrompt}`,
    `User's change (may be in any language): ${ctx.note.trim()}`,
    "",
    ...otherPromptLines(ctx.otherPrompts),
    "Apply the change, keep everything else, 2 to 4 sentences, English, no on-screen text.",
    'Return JSON only: {"prompt": "..."}',
  ].join("\n");
}

/**
 * Polish one shot's picture and camera, keeping the user's wording and intent
 */
export function buildShotPolishPrompt(ctx: ScriptContext & { shots: ScriptShot[]; shotId: string }): string {
  const lang = languageName(ctx.locale);
  const shot = ctx.shots.find((s) => s.id === ctx.shotId);
  return [
    "You are a short-video director polishing one shot of a storyboard.",
    "",
    "Context:",
    ...contextLines(ctx),
    "",
    "Whole storyboard, for consistency of lighting, setting and people:",
    JSON.stringify(ctx.shots.map(({ id, visual, camera, onScreenText }) => ({ id, visual, camera, onScreenText })), null, 2),
    "",
    `Shot to polish (the user may have just rewritten it): ${JSON.stringify(shot ?? {})}`,
    "",
    "Rewrite only this shot's \"visual\" and \"camera\":",
    "- Keep every idea and detail the user wrote; make it concrete and filmable (subject, action, setting, light).",
    "- One or two sentences for visual, one short phrase for camera.",
    "- Stay consistent with the neighbouring shots. No on-screen text in the picture.",
    `- Write in ${lang}.`,
    "",
    'Return JSON only: {"visual": "...", "camera": "..."}',
  ].join("\n");
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function seconds(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(str(value));
  if (!Number.isFinite(n) || n <= 0) return 4;
  return Math.min(10, Math.max(1, Math.round(n * 2) / 2));
}

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function parseScriptResult(raw: unknown): ScriptResult {
  const data = record(raw);
  const rows = Array.isArray(data.shots) ? data.shots : [];
  const kept = rows.map(record).filter((row) => str(row.visual)).slice(0, MAX_SHOTS);
  // Keep the AI's ids (they match shots to their images); fix missing or duplicate ones
  const ids = new Set<string>();
  const given = kept.map((row) => {
    const id = str(row.id);
    if (!/^s\d{2,}$/.test(id) || ids.has(id)) return "";
    ids.add(id);
    return id;
  });
  let next = Math.max(0, ...[...ids].map((id) => Number(id.slice(1))));
  const shots = kept
    .map((row, index): ScriptShot => ({
      id: given[index] || `s${String(++next).padStart(2, "0")}`,
      seconds: seconds(row.seconds),
      visual: str(row.visual),
      camera: str(row.camera),
      sound: str(row.sound),
      music: str(row.music) || "無",
      onScreenText: str(row.onScreenText),
      transition: str(row.transition),
      hasPackaging: row.hasPackaging === true,
    }));
  if (shots.length === 0) {
    throw new Error("Failed to parse AI response: no shots");
  }
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim())
    : [];
  return { shots, suggestions, reply: str(data.reply) };
}

export function parseImagePrompts(raw: unknown, ids: string[]): Record<string, string> {
  const prompts = record(record(raw).prompts);
  const result: Record<string, string> = {};
  for (const id of ids) {
    const prompt = str(prompts[id]);
    if (!prompt) throw new Error(`Failed to parse AI response: missing prompt for ${id}`);
    result[id] = prompt;
  }
  return result;
}

export function parseRewrittenPrompt(raw: unknown): string {
  const prompt = str(record(raw).prompt);
  if (!prompt) throw new Error("Failed to parse AI response: missing prompt");
  return prompt;
}

export type ScriptParseInput = ScriptContext & { sourceText: string };
export type ScriptReviseInput = ScriptContext & { shots: ScriptShot[]; chat: ChatMessage[]; message: string };
export type ImagePromptsInput = ScriptContext & { shots: ScriptShot[]; existingPrompts?: Record<string, string> };
export type ImagePromptRewriteInput = ScriptContext & {
  shot: ScriptShot;
  currentPrompt: string;
  note: string;
  otherPrompts?: Record<string, string>;
};

export function parsePolishedShot(raw: unknown): { visual: string; camera: string } {
  const data = record(raw);
  const visual = str(data.visual);
  if (!visual) throw new Error("Failed to parse AI response: missing visual");
  return { visual, camera: str(data.camera) };
}

export type ShotPolishInput = ScriptContext & { shots: ScriptShot[]; shotId: string };
