import { StyleProfile } from '../../../types';

export const soft2DStorybook: StyleProfile = {
  style_id: "soft_2d_storybook",
  style_name: "Soft 2D Storybook Watercolor",
  style_family: "storybook_painterly",
  positive_style_lock: "Classic 2D children's book illustration using soft watercolor and colored pencil textures. Warm, comforting, organic brushstrokes. Flat shading with subtle color gradients. Hand-drawn storybook charm.",
  character_rendering_rules: "Characters must be 2D hand-drawn watercolor style. No 3D forms. Simplified 2D features with expressive line-art and organic watercolor washes.",
  environment_rendering_rules: "Whimsical hand-painted 2D backgrounds with visible paper texture and watercolor bleeding.",
  lighting_rules: "Soft, diffused illustration lighting. No harsh 3D shadows or cinematic global illumination.",
  color_rules: "Pastel and warm organic watercolor tones. Avoid highly saturated digital colors.",
  texture_rules: "Visible cold-press watercolor paper texture and pencil stroke marks.",
  forbidden_styles: [
    "3D animated",
    "CGI",
    "photorealistic",
    "semi-realistic",
    "sharp digital vectors",
    "comic book ink",
    "anime",
    "cinematic lighting",
    "plastic texture",
    "real photographic depth of field"
  ],
  identity_translation_rule: "Translate key facial features and clothing into a charming 2D watercolor illustration style. Keep resemblance but flatten all geometry.",
  line_treatment: "Soft, loose colored pencil outlines.",
  shading_treatment: "Flat watercolor washes with minimal layered shading.",
  background_treatment: "Vignetted edges where the watercolor fades into the paper."
};
