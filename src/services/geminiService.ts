
import { generateBlueprint as agentBlueprint } from './story/blueprintAgent';
import { generateStoryDraft as agentDraft } from './story/narrativeAgent';
import { generateVisualPlan } from './visual/director';
import { generatePrompts } from './visual/promptEngineer';
import { runQualityAssurance } from './visual/qualityAssurance';
import { generateThemeStylePreview, describeSubject, generateTechnicalStyleGuide, generateImagenImage, generateMethod4Image } from './generation/imageGenerator';
import type { StoryBlueprint, Language, StoryTheme, WorkflowLog } from '../types';

export {
    generateVisualPlan,
    generatePrompts,
    runQualityAssurance,
    generateThemeStylePreview,
    describeSubject,
    generateTechnicalStyleGuide,
    generateImagenImage,
    generateMethod4Image
};

export async function generateBlueprint(
    contextPayload: {
        childName: string,
        childAge: number,
        themeId: string,
        themeTitle: string,
        themeData: StoryTheme,
        childDescription?: string,
        selectedStylePrompt?: string
    },
    language: Language = 'en'
): Promise<{ result: StoryBlueprint, log: WorkflowLog }> {
    const mockStoryData: any = {
        childName: contextPayload.childName,
        childAge: contextPayload.childAge,
        mainCharacter: { description: contextPayload.childDescription || "" },
        theme: contextPayload.themeTitle,
        customGoal: "",
        customChallenge: "",
        selectedStylePrompt: contextPayload.selectedStylePrompt
    };
    return agentBlueprint(mockStoryData, language as 'en' | 'ar');
}

export async function generateScript(
    blueprint: StoryBlueprint,
    language: Language,
    childAge: number,
    childName: string,
    childGender?: 'boy' | 'girl',
    secondCharacter?: any
): Promise<{ result: { text: string }[], log: WorkflowLog }> {
    return agentDraft(blueprint, language, childName, childGender, secondCharacter);
}
