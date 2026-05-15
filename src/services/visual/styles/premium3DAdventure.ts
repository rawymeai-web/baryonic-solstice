import { StyleProfile } from '../../../types';

export const premium3DAdventure: StyleProfile = {
  style_id: "premium_3d_adventure",
  style_name: "High-end stylized 3D animated children's adventure film frame",
  style_family: "3d_animated",
  positive_style_lock: "Polished 3D animated family adventure look with rounded appealing character design, expressive eyes, simplified facial anatomy, soft toy-like skin shading, smooth stylized hair clumps, clean readable silhouettes, warm cinematic story lighting, and premium children’s adventure atmosphere.",
  character_rendering_rules: "Characters must look like stylized animated versions of the real children, not realistic portraits.",
  environment_rendering_rules: "The environment must belong to the same stylized 3D world, with simplified readable shapes and softly detailed props.",
  lighting_rules: "Warm storybook lighting with soft shadows and gentle bounce light. No photographic lens blur.",
  color_rules: "Warm, inviting, emotionally clear colors matching the story mood.",
  texture_rules: "Clean polished surfaces, lightly tactile, no real skin pores or photographic detail.",
  forbidden_styles: [
    "photorealistic",
    "semi-realistic portrait",
    "realistic digital painting",
    "2D cartoon",
    "comic book line art",
    "anime",
    "watercolor",
    "oil painting",
    "flat vector",
    "real photographic depth of field"
  ],
  identity_translation_rule: "Use real photos only for identity cues. Preserve resemblance, but translate all features into the selected stylized 3D animation style."
};
