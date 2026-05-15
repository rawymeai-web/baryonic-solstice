import { StyleProfile } from '../../../types';
import { premium3DAdventure } from './premium3DAdventure';
import { soft2DStorybook } from './soft2DStorybook';

const styles: Record<string, StyleProfile> = {
  [premium3DAdventure.style_id]: premium3DAdventure,
  [soft2DStorybook.style_id]: soft2DStorybook,
};

export function getStyleProfile(styleId: string | undefined): StyleProfile {
  if (!styleId || !styles[styleId]) {
    // Default to premium 3D if not found or not provided
    return premium3DAdventure;
  }
  return styles[styleId];
}

export function getAllStyles(): StyleProfile[] {
  return Object.values(styles);
}
