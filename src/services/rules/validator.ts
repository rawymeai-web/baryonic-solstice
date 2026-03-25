
import { StoryBlueprint, SpreadDesignPlan } from '../../types';

export const Validator = {
    validateBlueprint: (blueprint: any): boolean => {
        if (!blueprint) return false;
        if (!blueprint.foundation || !blueprint.structure) return false;
        if (!Array.isArray(blueprint.structure.spreads)) return false;
        return true;
    },

    validateDraft: (draft: any[], expectedLength: number = 8): boolean => {
        if (!Array.isArray(draft)) return false;
        if (draft.length < expectedLength) return false;
        return true;
    },

    validateVisualPlan: (plan: any, expectedLength: number = 8): boolean => {
        if (!plan || !plan.spreads) return false;
        if (!Array.isArray(plan.spreads)) return false;
        // The plan might include a Cover (Spread 0), so it could be script.length + 1
        // Or sometimes it matches exactly. We should just check it has *enough* spreads.
        if (plan.spreads.length < expectedLength) return false;
        return true;
    }
};
