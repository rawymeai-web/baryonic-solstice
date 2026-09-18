import { 
    buildGenerationManifest, 
    buildStyleContract, 
    extractVerifiedBiometrics, 
    buildGenerationPayload, 
    MissingDnaError 
} from '../src/services/visual/manifestBuilder';
import { sanitizeHeroExpression } from '../src/services/visual/promptEngineer';

export async function runGenerationContractTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING GENERATION CONTRACTS & QA REGRESSION TESTS');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
            failed++;
        }
    }

    // 1. Single Hero + Recurring Prop Slot Mapping Test
    const singleHeroStoryData = {
        childName: "Kayan",
        childAge: "6",
        mainCharacter: {
            name: "Kayan",
            imageDNA: ["https://cdn.example.com/kayan_dna.jpg"]
        },
        blueprint: {
            foundation: {
                recurringAsset: {
                    name: "Starlight Bed-Boat",
                    description: "Carved pine hull with brass lanterns",
                    appearancesSpreads: [1, 2, 3],
                    imageUrl: "https://cdn.example.com/bed_boat.jpg"
                }
            },
            structure: {
                spreads: [
                    { narrative: "Kayan sailed across the stars in the Starlight Bed-Boat." }
                ]
            }
        },
        prompts: [
            {
                spreadNumber: 1,
                imagePrompt: "Kayan in [[PROP_ASSET]] Image 1 defines [[HERO_1]], Image 2 defines [[PROP_ASSET]]",
                storyText: "Kayan sailed across the stars."
            }
        ]
    };

    const singleManifest = buildGenerationManifest(singleHeroStoryData, "ORD-SINGLE-PROP");
    assert(singleManifest.heroes.length === 1, "Single-Hero Manifest hero count is 1");
    assert(singleManifest.propAsset?.slotNumber === 2, "Single-Hero Prop Asset is mapped to Slot 2");
    
    const singlePayload = buildGenerationPayload(singleManifest, 1);
    assert(singlePayload.referenceImages.length === 2, "Single-Hero Spread 1 has exactly 2 reference images");
    assert(singlePayload.referenceImages[0].slotNumber === 1, "Single-Hero Slot 1 is Hero A");
    assert(singlePayload.referenceImages[1].slotNumber === 2, "Single-Hero Slot 2 is Prop Asset");

    // 2. Dual Hero + Recurring Prop Slot Mapping Test
    const dualHeroStoryData = {
        childName: "Adam",
        childAge: "7",
        useSecondCharacter: true,
        mainCharacter: {
            name: "Adam",
            imageDNA: ["https://cdn.example.com/adam_dna.jpg"]
        },
        secondCharacter: {
            name: "Lina",
            type: "person",
            imageDNA: ["https://cdn.example.com/lina_dna.jpg"]
        },
        blueprint: {
            foundation: {
                recurringAsset: {
                    name: "Solar Glider",
                    description: "Golden wings with crystal gears",
                    appearancesSpreads: [1, 2],
                    imageUrl: "https://cdn.example.com/glider.jpg"
                }
            }
        },
        prompts: [
            {
                spreadNumber: 1,
                imagePrompt: "Adam and Lina riding [[PROP_ASSET]]",
                storyText: "They soared together."
            }
        ]
    };

    const dualManifest = buildGenerationManifest(dualHeroStoryData, "ORD-DUAL-PROP");
    assert(dualManifest.heroes.length === 2, "Dual-Hero Manifest hero count is 2");
    assert(dualManifest.propAsset?.slotNumber === 3, "Dual-Hero Prop Asset is mapped to Slot 3");
    
    const dualPayload = buildGenerationPayload(dualManifest, 1);
    assert(dualPayload.referenceImages.length === 3, "Dual-Hero Spread 1 has exactly 3 reference images");
    assert(dualPayload.referenceImages[0].slotNumber === 1, "Dual-Hero Slot 1 is Hero A");
    assert(dualPayload.referenceImages[1].slotNumber === 2, "Dual-Hero Slot 2 is Hero B");
    assert(dualPayload.referenceImages[2].slotNumber === 3, "Dual-Hero Slot 3 is Prop Asset");

    // 3. Biometric Extraction without Hallucinations
    const verifiedDesc = JSON.stringify({
        identity: {
            eye_color: "hazel",
            hair_color: "auburn",
            skin_tone: "warm ivory"
        }
    });
    const bio = extractVerifiedBiometrics(verifiedDesc);
    assert(bio.eyeColor === "hazel", "Extracts eye color accurately");
    assert(bio.hairColor === "auburn", "Extracts hair color accurately");
    assert(bio.skinTone === "warm ivory", "Extracts skin tone accurately");
    assert(bio.hasExplicitLocks === true, "Marks explicit locks as true");

    const emptyBio = extractVerifiedBiometrics({});
    assert(emptyBio.eyeColor === undefined, "Does not hallucinate eye color when missing");
    assert(emptyBio.hairColor === undefined, "Does not hallucinate hair color when missing");
    assert(emptyBio.skinTone === undefined, "Does not hallucinate skin tone when missing");
    assert(emptyBio.hasExplicitLocks === false, "Marks explicit locks as false when empty");

    // 4. Style Contract Dimensionality Parsing
    const story3D = {
        selectedStyleNames: ["Pixar 3D Animation"],
        technicalStyleGuide: "High quality 3D render, ambient occlusion, smooth surfaces"
    };
    const contract3D = buildStyleContract(story3D);
    assert(contract3D.dimensionality === "3D", "Identifies 3D style correctly");
    assert(contract3D.compiledStylePrompt.includes("3D stylized render"), "Appends 3D prompt directives");

    const story2D = {
        selectedStyleNames: ["Watercolor Whimsical"],
        technicalStyleGuide: "Delicate watercolor washes and ink outlines on textured paper"
    };
    const contract2D = buildStyleContract(story2D);
    assert(contract2D.dimensionality === "2D", "Identifies 2D style correctly");
    assert(!contract2D.compiledStylePrompt.includes("3D stylized render"), "Does not append 3D directives to 2D style");

    // 5. Hero Expression Sanitizer (Anti-Leak)
    const rawExpression = "She smiles happily with wide joyful eyes and an open grin.";
    const sanitized = sanitizeHeroExpression(rawExpression, "[[HERO_1]]");
    assert(!sanitized.includes("She smiles"), "Replaces gendered pronouns with token context");
    assert(sanitized.includes("[[HERO_1]]"), "Injects hero token into expression");

    console.log(`\n================================================================`);
    console.log(`📊 GENERATION CONTRACTS SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log(`================================================================\n`);

    return { passed, failed };
}
