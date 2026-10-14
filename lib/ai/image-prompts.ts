/**
 * Image (Nano Banana) prompts
 *
 * Copied from the CLI (feat/cli: cli/image-prompts.ts), originally ported from
 * IGiveUpOnLife (lib/gemini/prompts/similar.ts, image.ts):
 * similarity is a keep / change matrix over visual dimensions,
 * which the model follows more reliably than a one-line instruction.
 */

export const IMAGE_MODEL = "gemini-nano-banana-2.1";

export const IMAGE_RATIOS = ["1:1", "4:5", "5:4", "3:4", "4:3", "2:3", "3:2", "9:16", "16:9", "21:9"] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number];

export const IMAGE_SIZES = ["1K", "2K", "4K"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export type SimilarityLevel = "low" | "medium" | "high";

const NEGATIVE_PROMPT =
  "AVOID: distorted or redrawn product, modified packaging, wrong or invented text and labels, simplified Chinese, blurry details, unnatural proportions, added captions, watermarks, borders, low quality.";

const NO_TEXT_RULE =
  "Do NOT add any headline, caption, typography, watermark or border to the image — text will be added later by a designer.";

const DIMENSIONS = ["composition", "cameraAngle", "lighting", "colorPalette", "background", "props"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIMENSION_TEXT: Record<Dimension, string> = {
  composition: "Composition — subject placement, framing, crop and negative space",
  cameraAngle: "Camera — height, angle, distance and lens perspective",
  lighting: "Lighting — key light direction, softness, contrast and shadow character",
  colorPalette: "Color — palette, tonal range, color grading and overall mood",
  background: "Background — surface, setting and environment",
  props: "Props — supporting objects, styling details and their arrangement",
};

const SIMILARITY_RULES: Record<
  SimilarityLevel,
  { label: string; summary: string; keep: readonly Dimension[]; change: readonly Dimension[]; note: string }
> = {
  high: {
    label: "HIGH",
    summary: "A near-replica of the reference scene with our product swapped in.",
    keep: DIMENSIONS,
    change: [],
    note: "Replace only the reference's main subject with our product. Adapt scale, contact shadows and reflections so the product sits naturally in the scene.",
  },
  medium: {
    label: "MEDIUM",
    summary: "Same look and feel as the reference, but a new shot.",
    keep: ["lighting", "colorPalette", "background"],
    change: ["composition", "cameraAngle", "props"],
    note: "The background may keep its style and materials but be re-arranged for the new composition.",
  },
  low: {
    label: "LOW",
    summary: "Only the color mood of the reference; everything else is a fresh creative idea.",
    keep: ["colorPalette"],
    change: ["composition", "cameraAngle", "lighting", "background", "props"],
    note: "Treat the reference as a mood board, not a layout. The result should not look like a copy of IMAGE A.",
  },
};

const VARIATION_HINTS: Record<SimilarityLevel, readonly string[]> = {
  high: [
    "the closest possible match to the reference",
    "a subtle change in the product's angle",
    "a slightly different camera distance",
    "a small variation in prop positions",
    "a minor nuance in light falloff",
  ],
  medium: [
    "an eye-level front view",
    "an elevated three-quarter view",
    "a tight hero close-up",
    "a wider environmental shot",
    "a low angle looking slightly up",
    "a top-down flat lay",
  ],
  low: [
    "a bold graphic composition",
    "a lifestyle scene in use",
    "a minimal sculptural set",
    "a dramatic spotlight scene",
    "a natural outdoor setting",
    "a top-down flat lay with geometric props",
  ],
};

export const COPY_SPACES = ["none", "top", "bottom", "left", "right"] as const;
export type CopySpace = (typeof COPY_SPACES)[number];

const COPY_SPACE_TEXT: Record<Exclude<CopySpace, "none">, string> = {
  top: "the top third",
  bottom: "the bottom third",
  left: "the left third",
  right: "the right third",
};

export const SIMILAR_LABELS = {
  reference:
    "IMAGE A — STYLE REFERENCE. Use it only for the attributes listed under KEEP. Do NOT copy its product, brand marks, logos, watermarks or text.",
  product:
    "IMAGE B — OUR PRODUCT. It must appear exactly as shown: shape, proportions, colors, materials, labels, logos and printed text.",
  secondary: "IMAGE C — SECONDARY PRODUCT. A supporting product that appears together with IMAGE B, unaltered.",
} as const;

function wrapUserInput(tag: string, text: string): string {
  return `<${tag}>\n${text.trim()}\n</${tag}>`;
}

function variation(level: SimilarityLevel | undefined, index: number, count: number): string {
  if (count <= 1) return "";
  const hints = VARIATION_HINTS[level ?? "medium"];
  return `VARIATION ${index + 1} of ${count}: aim for ${hints[index % hints.length]}, so this result differs from the other variations while following the rules above.`;
}

/** Reference image + product image → new shot at the given similarity */
export function buildSimilarInstruction(options: {
  similarity: SimilarityLevel;
  ratio: string;
  hasSecondary?: boolean;
  copySpace?: CopySpace;
  direction?: string;
  index: number;
  count: number;
}): string {
  const rule = SIMILARITY_RULES[options.similarity];
  const sections = [
    `TASK: Create a new professional product photograph of the product in IMAGE B, using IMAGE A as the style reference.\nSIMILARITY: ${rule.label} — ${rule.summary}`,
    `KEEP from IMAGE A:\n${rule.keep.map((d) => `- ${DIMENSION_TEXT[d]}`).join("\n")}`,
    rule.change.length
      ? `CHANGE — design these fresh, do not copy IMAGE A:\n${rule.change.map((d) => `- ${DIMENSION_TEXT[d]}`).join("\n")}`
      : "",
    rule.note,
    options.hasSecondary
      ? "Include the product from IMAGE C as a secondary element next to IMAGE B. IMAGE B stays the hero."
      : "",
    "PRODUCT FIDELITY (non-negotiable): Reproduce IMAGE B exactly. Never redraw, restyle, translate or invent packaging text. Keep realistic scale.",
    options.copySpace && options.copySpace !== "none"
      ? `COPY SPACE: Keep ${COPY_SPACE_TEXT[options.copySpace]} of the frame as clean, low-detail negative space for text added later. Keep the product out of that area.`
      : "",
    variation(options.similarity, options.index, options.count),
    `OUTPUT: aspect ratio ${options.ratio}. A clean photograph only — no added headline, caption, watermark or border.`,
    options.direction?.trim()
      ? `Additional direction from the user (follow it unless it conflicts with PRODUCT FIDELITY):\n${wrapUserInput("user_direction", options.direction)}`
      : "",
    NEGATIVE_PROMPT,
  ];
  return sections.filter(Boolean).join("\n\n");
}

function packagingRule(packagingText?: string): string {
  return packagingText?.trim()
    ? `PACKAGING TEXT: Any visible packaging must read exactly "${packagingText.trim()}". Copy it letter for letter from the product image; do not translate, restyle or add other text.`
    : "";
}

function referenceRoles(options: { productCount: number; characterCount: number; shotRef: boolean }): string {
  const roles: string[] = [];
  let next = 1;
  const add = (count: number, role: string) => {
    if (!count) return;
    roles.push(`${count === 1 ? `IMAGE ${next}` : `IMAGES ${next}–${next + count - 1}`}: ${role}`);
    next += count;
  };
  add(options.productCount, "the real product. Keep its shape, materials and packaging exactly as shown.");
  add(
    options.characterCount,
    "character and setting references. Keep the same people (face, hair, body, clothing) and the same look of the setting. Do not copy their framing or pose."
  );
  add(
    options.shotRef ? 1 : 0,
    "an earlier frame of this storyboard. Keep the same people, clothing, setting, lighting and color mood, but compose the new shot as described below; do not copy its framing."
  );
  if (options.characterCount || options.shotRef) {
    // The shot text may describe people differently (e.g. written before the references existed)
    roles.push(
      "If the shot description below disagrees with the references about how a person looks or dresses (face, hair, glasses, clothing), the references win."
    );
  }
  return roles.join("\n");
}

/** Free prompt, optionally guided by reference images — e.g. a storyboard keyframe */
export function buildKeyframeInstruction(options: {
  prompt: string;
  ratio: string;
  /** Attached in this order: products, character/setting references, an earlier storyboard frame */
  productCount: number;
  characterCount: number;
  shotRef: boolean;
  index: number;
  count: number;
  packagingText?: string;
}): string {
  const sections = [
    referenceRoles(options),
    wrapUserInput("shot", options.prompt),
    variation(undefined, options.index, options.count),
    packagingRule(options.packagingText),
    `OUTPUT: aspect ratio ${options.ratio}.`,
    NO_TEXT_RULE,
    NEGATIVE_PROMPT,
  ];
  return sections.filter(Boolean).join("\n\n");
}

/** Re-render an approved storyboard frame at a higher resolution */
export function buildFinalInstruction(options: {
  prompt: string;
  ratio: string;
  productCount: number;
  packagingText?: string;
}): string {
  const sections = [
    "The FIRST image is the approved storyboard frame. Reproduce it as faithfully as possible: same composition, framing, subject, pose, lighting and colors, with more detail and sharper textures.",
    options.productCount
      ? `The other ${options.productCount > 1 ? "images show" : "image shows"} the real product: keep its shape, materials and packaging exactly as shown.`
      : "",
    wrapUserInput("shot", options.prompt),
    packagingRule(options.packagingText),
    `OUTPUT: aspect ratio ${options.ratio}.`,
    NO_TEXT_RULE,
    NEGATIVE_PROMPT,
  ];
  return sections.filter(Boolean).join("\n\n");
}
