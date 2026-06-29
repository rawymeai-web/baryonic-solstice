import { supabase } from '@/utils/supabaseClient';
import { describeSubject, describeObjectProp, generateThemeStylePreview, generateObjectStylePreview } from '@/services/generation/imageGenerator';
import { WorkerUtils } from './workerUtils';
import { MasterScheduler } from './scheduler';

export class CharacterWorker {
    /**
     * Executes the Character Processing job.
     * Takes a raw photo and generates:
     * 1. A detailed AI text description (Text DNA).
     * 2. A high-quality character reference illustration (Visual DNA anchor).
     */
    static async processJob(jobId: string, orderId: string, attempts: number) {
        console.log(`[CharacterWorker] Initiating Job ${jobId} for Order ${orderId}`);

        try {
            // Lock the job
            const { data: lockResult, error: lockErr } = await supabase
                .from('order_jobs')
                .update({ status: 'running', started_at: new Date().toISOString() })
                .eq('id', jobId)
                .eq('status', 'queued')
                .select();

            if (lockErr || !lockResult || lockResult.length === 0) return;

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('story_data')
                .eq('order_number', orderId)
                .single();

            if (orderError || !order) throw new Error("Order not found");

            const storyData = order.story_data as any;
            const mainChar = storyData.mainCharacter;

            if (!mainChar || !mainChar.imageBases64 || !mainChar.imageBases64[0]) {
                console.warn(`[CharacterWorker] No image photo found for ${orderId}. Skipping character generation.`);
                // Fast-track to story if no image present
                await this.completeJob(jobId, orderId, storyData);
                return;
            }

            // STYLE DNA: Use same priority chain as StoryWorker and IllustrationWorker.
            // technicalStyleGuide is the locked style from the frontend StyleSelectionScreen.
            const resolvedStyleDNA: string =
                storyData.selectedStyleNames?.[0] ||
                storyData.technicalStyleGuide ||
                storyData.selectedStylePrompt ||
                storyData.themeVisualDNA ||
                "high quality painterly children's book illustration";

            // 1. Resolve Text DNA Description for Primary Character
            let description = "";
            const existingDesc = mainChar.description;
            if (existingDesc && typeof existingDesc === 'string' && existingDesc.trim().startsWith('{')) {
                console.log(`[CharacterWorker] Reusing existing Text DNA description for ${orderId}`);
                description = existingDesc;
            } else if (existingDesc && typeof existingDesc === 'object' && Object.keys(existingDesc).length > 0) {
                console.log(`[CharacterWorker] Reusing existing Text DNA description (object) for ${orderId}`);
                description = JSON.stringify(existingDesc);
            } else {
                console.log(`[CharacterWorker] Processing Text DNA for ${orderId}...`);
                description = await WorkerUtils.withTimeout(describeSubject(mainChar.imageBases64[0]));
            }

            // 2. Resolve Visual DNA for Primary Character
            const existingDNA = mainChar.imageDNA?.[0] || storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64;
            let stylePreviewBase64 = "";
            let styleUsed = storyData.selectedStylePrompt || resolvedStyleDNA;

            if (existingDNA) {
                console.log(`[CharacterWorker] Reusing existing Visual DNA for Primary Character ${orderId}`);
                if (existingDNA.startsWith('http')) {
                    try {
                        const res = await fetch(existingDNA);
                        const arrayBuffer = await res.arrayBuffer();
                        stylePreviewBase64 = Buffer.from(arrayBuffer).toString('base64');
                    } catch (e: any) {
                        console.error(`Failed to download existing DNA from URL:`, e.message);
                    }
                } else {
                    stylePreviewBase64 = existingDNA;
                }
            }

            if (!stylePreviewBase64) {
                console.log(`[CharacterWorker] Processing Visual DNA for Primary Character ${orderId}...`);
                const stylePreview = await WorkerUtils.withTimeout(
                    generateThemeStylePreview(
                        mainChar,
                        undefined, // NEVER BUNDLE THEM TOGETHER IN THE VISION V2 ARCHITECTURE
                        storyData.theme || "story setting",
                        resolvedStyleDNA,
                        storyData.childAge || "5"
                    )
                );
                stylePreviewBase64 = stylePreview.imageBase64;
                styleUsed = stylePreview.styleUsed || resolvedStyleDNA;
            }

            // 3. Resolve Second Character DNA if it exists
            let secondDescription = "";
            let secondImageDNA = "";
            if (storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.imageBases64 && storyData.secondCharacter.imageBases64[0]) {
                const existingSecondDesc = storyData.secondCharacter.description;
                if (existingSecondDesc && typeof existingSecondDesc === 'string' && existingSecondDesc.trim().startsWith('{')) {
                    secondDescription = existingSecondDesc;
                } else if (existingSecondDesc && typeof existingSecondDesc === 'object' && Object.keys(existingSecondDesc).length > 0) {
                    secondDescription = JSON.stringify(existingSecondDesc);
                } else {
                    console.log(`[CharacterWorker] Processing Text DNA for second character in ${orderId}...`);
                    if (storyData.secondCharacter.type === 'object') {
                        secondDescription = await WorkerUtils.withTimeout(describeObjectProp(storyData.secondCharacter.imageBases64[0]));
                    } else {
                        secondDescription = await WorkerUtils.withTimeout(describeSubject(storyData.secondCharacter.imageBases64[0]));
                    }
                }

                const existingSecondDNA = storyData.secondCharacter.imageDNA?.[0] || storyData.secondCharacterImageUrl || storyData.secondCharacterImageBase64;
                if (existingSecondDNA) {
                    console.log(`[CharacterWorker] Reusing existing Visual DNA for Secondary Character ${orderId}`);
                    if (existingSecondDNA.startsWith('http')) {
                        try {
                            const res = await fetch(existingSecondDNA);
                            const arrayBuffer = await res.arrayBuffer();
                            secondImageDNA = Buffer.from(arrayBuffer).toString('base64');
                        } catch (e: any) {
                            console.error(`Failed to download secondary DNA from URL:`, e.message);
                        }
                    } else {
                        secondImageDNA = existingSecondDNA;
                    }
                }

                if (!secondImageDNA) {
                    console.log(`[CharacterWorker] Processing Visual DNA for Second Character in ${orderId}...`);
                    if (storyData.secondCharacter.type === 'object') {
                        const objectStylePreview = await WorkerUtils.withTimeout(
                            generateObjectStylePreview(
                                storyData.secondCharacter.imageBases64[0],
                                storyData.technicalStyleGuide || storyData.selectedStylePrompt || "high quality storybook illustration",
                                secondDescription
                            )
                        );
                        secondImageDNA = objectStylePreview.imageBase64;
                    } else {
                        const charStylePreview = await WorkerUtils.withTimeout(
                            generateThemeStylePreview(
                                storyData.secondCharacter as any,
                                undefined,
                                storyData.theme || "story setting",
                                storyData.technicalStyleGuide || storyData.selectedStylePrompt || "high quality storybook illustration",
                                storyData.secondCharacter.age || storyData.childAge || "5"
                            )
                        );
                        secondImageDNA = charStylePreview.imageBase64;
                    }
                }
            }

            // 4. Helper to upload base64 image to storage and log to order_dna
            const uploadAndLogDNAToTable = async (base64Str: string | undefined, heroLabel: string, imageType: string) => {
                if (!base64Str || base64Str.length < 100) return;
                try {
                    // Check if a record already exists in order_dna to avoid duplicates
                    const { data: existingRecords } = await supabase
                        .from('order_dna')
                        .select('id')
                        .eq('order_id', orderId)
                        .eq('hero_label', heroLabel)
                        .eq('image_type', imageType)
                        .limit(1);
                        
                    if (existingRecords && existingRecords.length > 0) {
                        console.log(`[CharacterWorker] DNA record for ${heroLabel} (${imageType}) already exists in order_dna table.`);
                        return;
                    }

                    const cleanB64 = base64Str.includes('base64,') ? base64Str.split('base64,')[1] : base64Str;
                    const buffer = Buffer.from(cleanB64, 'base64');
                    const filename = `${orderId}/${heroLabel.replace(' ', '_')}_${imageType.replace(' ', '_')}_${Date.now()}.jpg`;
                    
                    const { error: uploadErr } = await supabase.storage.from('dna-images').upload(filename, buffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });
                    
                    if (!uploadErr) {
                        const { data: publicData } = supabase.storage.from('dna-images').getPublicUrl(filename);
                        await supabase.from('order_dna').insert({
                            order_id: orderId,
                            hero_label: heroLabel,
                            image_type: imageType,
                            image_url: publicData.publicUrl
                        });
                        console.log(`[CharacterWorker] Logged ${imageType} for ${heroLabel} to order_dna.`);
                    } else {
                        console.error(`[CharacterWorker] Failed to upload ${imageType} for ${heroLabel}:`, uploadErr);
                    }
                } catch (err: any) {
                    console.error(`[CharacterWorker] Error in uploadAndLogDNAToTable:`, err.message);
                }
            };

            // Log DNA to order_dna table for modern architecture
            await uploadAndLogDNAToTable(mainChar.imageBases64?.[0], 'Hero A', 'Original Photo');
            await uploadAndLogDNAToTable(stylePreviewBase64, 'Hero A', 'Stylized DNA');
            if (storyData.useSecondCharacter && storyData.secondCharacter?.imageBases64?.[0]) {
                await uploadAndLogDNAToTable(storyData.secondCharacter.imageBases64[0], 'Hero B', 'Original Photo');
            }
            if (storyData.useSecondCharacter && secondImageDNA) {
                await uploadAndLogDNAToTable(secondImageDNA, 'Hero B', 'Stylized DNA');
            }

            // Helper to safely parse description - it may be a JSON string, plain text, or already an object
            const safeParseDesc = (desc: any): any => {
                if (!desc) return desc;
                if (typeof desc === 'object') return desc;
                try { return JSON.parse(desc); } catch { return desc; }
            };

            // Update story_data with the resolved DNA
            const updatedStoryData = {
                ...storyData,
                mainCharacter: {
                    ...mainChar,
                    description: safeParseDesc(description),
                    imageDNA: [stylePreviewBase64] // This is the definitive visual anchor
                },
                secondCharacter: storyData.secondCharacter ? {
                    ...storyData.secondCharacter,
                    description: secondDescription ? safeParseDesc(secondDescription) : storyData.secondCharacter.description,
                    imageDNA: secondImageDNA ? [secondImageDNA] : undefined // Persist the stylized object!
                } : undefined,
                selectedStylePrompt: styleUsed // Lock the clean style prompt used
            };

            await this.completeJob(jobId, orderId, updatedStoryData);

        } catch (error: any) {
            console.error(`[CharacterWorker] Error:`, error);
            await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
        }
    }

    private static async completeJob(jobId: string, orderId: string, updatedStoryData: any) {
        await supabase.from('orders').update({
            story_data: updatedStoryData,
            status: 'character_ready'
        }).eq('order_number', orderId);

        await supabase.from('order_jobs').update({
            status: 'completed',
            finished_at: new Date().toISOString()
        }).eq('id', jobId);

        // Audit
        await supabase.from('event_audit_log').insert({
            event_type: 'character_processed',
            order_id: orderId,
            details: { charName: updatedStoryData.mainCharacter?.name }
        });

        // Dispatch next step: Story Generation
        await MasterScheduler.dispatchJob(orderId, 'story');
    }
}
