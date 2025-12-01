/**
 * Visual Style Vocabulary Library
 * A comprehensive collection of aesthetic terms for video generation prompts
 */

// ============ Camera Movements ============
export const CAMERA_MOVEMENTS = {
  // Static shots
  static: ["locked-off shot", "static frame", "tripod shot", "stationary camera"],

  // Basic movements
  pan: ["smooth pan", "slow pan left/right", "whip pan", "panoramic sweep"],
  tilt: ["gentle tilt up/down", "reveal tilt", "Dutch tilt"],
  zoom: ["slow zoom in", "dramatic zoom out", "crash zoom", "dolly zoom"],

  // Dynamic movements
  dolly: ["dolly forward", "dolly back", "dolly push", "pull back reveal"],
  tracking: ["tracking shot", "follow shot", "lateral tracking", "arc shot"],
  crane: ["crane up", "crane down", "jib shot", "overhead crane"],

  // Handheld & Stabilized
  handheld: ["handheld shake", "documentary style", "intimate handheld"],
  steadicam: ["steadicam glide", "smooth steadicam", "floating camera"],
  gimbal: ["gimbal stabilized", "smooth gimbal movement", "fluid motion"],

  // Creative movements
  orbit: ["360 orbit", "circular orbit", "partial orbit around subject"],
  reveal: ["pull back reveal", "push in reveal", "vertical reveal"],
  parallax: ["parallax shift", "depth parallax", "layered parallax motion"],
} as const;

// ============ Lighting Styles ============
export const LIGHTING_STYLES = {
  // Natural lighting
  natural: {
    daylight: ["soft daylight", "harsh midday sun", "overcast diffused light"],
    goldenHour: ["golden hour warmth", "sunset glow", "magic hour lighting"],
    blueHour: ["blue hour ambiance", "twilight tones", "pre-dawn blue"],
    backlit: ["rim lighting", "silhouette backlight", "halo backlight"],
  },

  // Studio lighting
  studio: {
    softbox: ["soft diffused studio light", "beauty lighting", "flattering softbox"],
    dramatic: ["high contrast lighting", "chiaroscuro", "Rembrandt lighting"],
    product: ["clean product lighting", "gradient background", "reflection control"],
    portrait: ["butterfly lighting", "loop lighting", "split lighting"],
  },

  // Cinematic lighting
  cinematic: {
    noir: ["film noir shadows", "venetian blind shadows", "high contrast noir"],
    neon: ["neon glow", "cyberpunk neon", "colorful neon reflections"],
    volumetric: ["volumetric light rays", "god rays", "atmospheric haze"],
    practical: ["practical light sources", "motivated lighting", "in-frame lights"],
  },

  // Mood-based
  mood: {
    warm: ["warm amber tones", "cozy warm light", "candlelit warmth"],
    cool: ["cool blue tones", "moonlight cool", "clinical cool light"],
    dramatic: ["dramatic shadows", "moody contrast", "intense spotlight"],
    ethereal: ["dreamy soft glow", "ethereal light", "heavenly rays"],
  },
} as const;

// ============ Color Grading ============
export const COLOR_GRADING = {
  // Film looks
  film: {
    kodak: ["Kodak Portra warmth", "film grain texture", "Kodak gold tones"],
    fuji: ["Fuji Superia colors", "Japanese film tones", "Fuji velvia saturation"],
    cinematic: ["teal and orange", "cinematic color grade", "blockbuster look"],
    vintage: ["faded vintage", "70s film look", "retro color shift"],
  },

  // Modern styles
  modern: {
    clean: ["clean neutral grade", "minimal color correction", "true-to-life colors"],
    vibrant: ["punchy vibrant colors", "saturated pop", "bold color contrast"],
    desaturated: ["muted tones", "desaturated mood", "subtle color palette"],
    monochrome: ["black and white", "high contrast B&W", "silver gelatin look"],
  },

  // Stylized
  stylized: {
    pastel: ["soft pastel tones", "washed out pastels", "candy colors"],
    neon: ["neon color pop", "cyberpunk palette", "electric colors"],
    earthy: ["earthy natural tones", "organic colors", "forest palette"],
    luxury: ["rich deep tones", "luxury gold accents", "premium color grade"],
  },
} as const;

// ============ Video Aesthetics ============
export const VIDEO_AESTHETICS = {
  // Commercial styles
  commercial: {
    premium: ["premium brand aesthetic", "luxury commercial", "high-end product shot"],
    lifestyle: ["lifestyle authenticity", "aspirational lifestyle", "relatable moments"],
    tech: ["clean tech aesthetic", "futuristic product", "innovation showcase"],
    fashion: ["editorial fashion", "runway style", "haute couture aesthetic"],
  },

  // Artistic styles
  artistic: {
    minimalist: ["minimalist composition", "negative space", "less is more"],
    maximalist: ["rich maximalist detail", "layered complexity", "visual abundance"],
    abstract: ["abstract motion", "non-representational", "experimental visuals"],
    surreal: ["surrealist imagery", "dreamlike quality", "impossible spaces"],
  },

  // Era-specific
  era: {
    retro80s: ["80s synthwave", "retro neon", "VHS aesthetic"],
    retro90s: ["90s nostalgia", "grunge aesthetic", "MTV style"],
    y2k: ["Y2K aesthetic", "cyber futurism", "chrome and holographic"],
    modern: ["contemporary clean", "2020s minimal", "current trends"],
  },

  // Cultural
  cultural: {
    japanese: ["Japanese aesthetic", "wabi-sabi beauty", "anime-inspired"],
    scandinavian: ["Scandinavian minimal", "hygge warmth", "Nordic clean"],
    mediterranean: ["Mediterranean warmth", "sun-drenched colors", "coastal vibes"],
    urban: ["urban grit", "street style", "city energy"],
  },
} as const;

// ============ Motion Quality ============
export const MOTION_QUALITY = {
  speed: {
    slowMotion: ["smooth slow motion", "120fps slow-mo", "ultra slow motion reveal"],
    realTime: ["real-time natural motion", "1x speed", "authentic movement"],
    fastMotion: ["dynamic fast motion", "time-lapse speed", "accelerated action"],
    timelapse: ["time-lapse transformation", "day to night timelapse", "cloud timelapse"],
  },

  feel: {
    smooth: ["buttery smooth motion", "fluid movement", "seamless transitions"],
    snappy: ["quick snappy cuts", "energetic motion", "punchy timing"],
    organic: ["organic natural flow", "breathing motion", "living movement"],
    mechanical: ["precise mechanical motion", "robotic precision", "industrial rhythm"],
  },

  energy: {
    calm: ["calm serene pace", "meditative rhythm", "peaceful flow"],
    moderate: ["balanced energy", "comfortable pace", "engaging rhythm"],
    dynamic: ["high energy", "dynamic pace", "exciting momentum"],
    intense: ["intense rapid motion", "adrenaline pace", "overwhelming energy"],
  },
} as const;

// ============ Composition Rules ============
export const COMPOSITION = {
  framing: {
    ruleOfThirds: ["rule of thirds placement", "off-center subject", "balanced asymmetry"],
    centered: ["centered symmetry", "direct center framing", "formal composition"],
    leadingLines: ["leading lines to subject", "perspective lines", "guiding the eye"],
    framing: ["natural frame within frame", "doorway framing", "environmental framing"],
  },

  depth: {
    shallow: ["shallow depth of field", "bokeh background", "subject isolation"],
    deep: ["deep focus", "everything sharp", "full scene in focus"],
    layered: ["foreground interest", "mid-ground subject", "background context"],
    atmospheric: ["atmospheric depth", "haze layers", "depth through atmosphere"],
  },

  scale: {
    extreme_closeup: ["extreme close-up detail", "macro shot", "intimate detail"],
    closeup: ["close-up portrait", "face filling frame", "emotional proximity"],
    medium: ["medium shot", "waist-up framing", "conversational distance"],
    wide: ["wide establishing shot", "environmental context", "full scene"],
    aerial: ["aerial perspective", "bird's eye view", "drone shot"],
  },
} as const;

// ============ Helper Functions ============

/**
 * Get random items from an array
 */
function getRandomItems<T>(arr: readonly T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Build a comprehensive prompt enhancement based on style preferences
 */
export function buildStyleEnhancement(options: {
  mood?: "energetic" | "calm" | "dramatic" | "playful" | "sophisticated";
  genre?: "commercial" | "artistic" | "documentary" | "cinematic";
  colorTone?: "warm" | "cool" | "neutral" | "vibrant";
}): string {
  const enhancements: string[] = [];

  // Add camera movement suggestion
  const movements = options.mood === "calm"
    ? CAMERA_MOVEMENTS.static
    : options.mood === "energetic"
    ? [...CAMERA_MOVEMENTS.tracking, ...CAMERA_MOVEMENTS.handheld]
    : CAMERA_MOVEMENTS.dolly;
  enhancements.push(getRandomItems(movements, 1)[0]);

  // Add lighting based on mood
  if (options.mood === "dramatic") {
    enhancements.push(getRandomItems(LIGHTING_STYLES.cinematic.noir, 1)[0]);
  } else if (options.mood === "calm") {
    enhancements.push(getRandomItems(LIGHTING_STYLES.natural.goldenHour, 1)[0]);
  } else if (options.mood === "sophisticated") {
    enhancements.push(getRandomItems(LIGHTING_STYLES.studio.dramatic, 1)[0]);
  }

  // Add color grading
  if (options.colorTone === "warm") {
    enhancements.push(getRandomItems(COLOR_GRADING.film.kodak, 1)[0]);
  } else if (options.colorTone === "cool") {
    enhancements.push("cool blue undertones");
  } else if (options.colorTone === "vibrant") {
    enhancements.push(getRandomItems(COLOR_GRADING.modern.vibrant, 1)[0]);
  }

  // Add aesthetic based on genre
  if (options.genre === "commercial") {
    enhancements.push(getRandomItems(VIDEO_AESTHETICS.commercial.premium, 1)[0]);
  } else if (options.genre === "artistic") {
    enhancements.push(getRandomItems(VIDEO_AESTHETICS.artistic.minimalist, 1)[0]);
  } else if (options.genre === "cinematic") {
    enhancements.push(getRandomItems(COLOR_GRADING.film.cinematic, 1)[0]);
  }

  return enhancements.join(", ");
}

/**
 * Get style vocabulary for a specific category
 */
export function getStyleVocabulary(category: keyof typeof VIDEO_AESTHETICS): string[] {
  const styles = VIDEO_AESTHETICS[category];
  return Object.values(styles).flat();
}

/**
 * Build a visual prompt suffix with professional terminology
 */
export function buildVisualPromptSuffix(options: {
  cameraMovement?: keyof typeof CAMERA_MOVEMENTS;
  lightingStyle?: "natural" | "studio" | "cinematic" | "mood";
  motionQuality?: keyof typeof MOTION_QUALITY.feel;
  compositionStyle?: keyof typeof COMPOSITION.framing;
}): string {
  const parts: string[] = [];

  if (options.cameraMovement) {
    const movements = CAMERA_MOVEMENTS[options.cameraMovement];
    parts.push(getRandomItems(movements, 1)[0]);
  }

  if (options.lightingStyle) {
    const lighting = LIGHTING_STYLES[options.lightingStyle];
    const lightingOptions = Object.values(lighting).flat();
    parts.push(getRandomItems(lightingOptions, 1)[0]);
  }

  if (options.motionQuality) {
    const motion = MOTION_QUALITY.feel[options.motionQuality];
    parts.push(getRandomItems(motion, 1)[0]);
  }

  if (options.compositionStyle) {
    const composition = COMPOSITION.framing[options.compositionStyle];
    parts.push(getRandomItems(composition, 1)[0]);
  }

  return parts.join(", ");
}

// ============ Prompt Templates ============

/**
 * Templates for different video styles
 */
export const PROMPT_TEMPLATES = {
  productShowcase: (product: string, action: string) =>
    `${product}, ${action}, premium product photography, clean studio lighting, smooth dolly movement, shallow depth of field, luxury commercial aesthetic`,

  lifestyleScene: (subject: string, setting: string, mood: string) =>
    `${subject} in ${setting}, ${mood} atmosphere, golden hour lighting, steadicam follow shot, lifestyle authenticity, aspirational feel`,

  dynamicAction: (subject: string, action: string) =>
    `${subject} ${action}, dynamic camera tracking, high energy, dramatic lighting, cinematic color grade, impactful motion`,

  calmAmbient: (scene: string, element: string) =>
    `${scene} with ${element}, serene atmosphere, soft natural light, slow gentle movement, meditative pace, minimalist composition`,

  techShowcase: (product: string, feature: string) =>
    `${product} demonstrating ${feature}, clean futuristic aesthetic, cool blue lighting, precise mechanical motion, tech innovation feel`,
} as const;
