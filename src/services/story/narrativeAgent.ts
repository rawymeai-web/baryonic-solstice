
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { getWordCountForAge } from '../rules/guidebook';
import { StoryBlueprint, WorkflowLog, Language } from '../../types';

// =========================================================================
// 1. SPREAD-BY-SPREAD FUNCTION MAPS
// =========================================================================
export const SINGLE_HERO_FUNCTION_MAP = `
Spread 1 — Ground & Introduce: name the hero, their home base, and why
  THIS goal matters to them specifically. State the anchor object's one
  physical rule (when/why it glows, hums, whatever it does).
Spread 2 — Catalyst: the problem or companion appears, sensed from the
  home base (a sound, a sight) — not dropped in with no lead-in.
Spread 3 — First Attempt: the hero tries their natural approach, and it
  fails BECAUSE of their trait. Say the "because" — don't leave it for
  the reader to infer.
Spread 4 — Complication: the failure deepens; a calm, passive
  mentor-figure appears (an animal, not a person).
Spread 5 — Low Point: the hero's lowest emotional beat, named directly
  ("felt sad," not just a physical description); the anchor object dims.
Spread 6 — Insight: the hero notices something through stillness or
  observation, realizes what to do, and the anchor object responds.
Spread 7 — Climax: the hero acts on the insight and succeeds through
  their OWN changed behavior — not luck, not the mentor doing it for them.
Spread 8 — Return & Close: an explicit bridge back to Spread 1's home
  base, in the same words used there, ending on a warm, concrete,
  non-preachy line.
`.trim();

export const DUAL_HERO_FUNCTION_MAP = `
Spread 1 — Ground & Introduce Both: name both heroes, their relationship,
  their shared home base, and why this goal matters to them. State the
  anchor object's rule.
Spread 2 — Catalyst: the problem or companion appears, sensed from the
  home base. If one hero arrives rather than starting the scene, give
  them a warm on-screen entrance here.
Spread 3 — First Attempt: the failure comes from a MISMATCH between the
  two heroes' natural approaches (one rushes, one hesitates) — say the
  "because," and make clear it's the friction between them, not one
  hero's fault alone.
Spread 4 — Complication: the failure deepens for both; a calm
  mentor-figure appears.
Spread 5 — Low Point: EACH hero gets their own named feeling — they
  should not feel identical or interchangeable. This is what makes a
  second hero a real character instead of a prop.
Spread 6 — Insight: the realization can belong to one hero or emerge
  from both, but the other hero must visibly react or contribute, not
  just watch.
Spread 7 — Climax: BOTH heroes act, each contributing something distinct
  only they could bring — a partnership, not one hero solving it while
  the other stands nearby.
Spread 8 — Return & Close: both return together; the close reflects
  what changed between them, not just one hero's arc.
`.trim();

// =========================================================================
// 2. GOLD STANDARD EXEMPLARS (EN & AR)
// =========================================================================

const SINGLE_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR A (Bedtime Theme, Hero: "Zara", Anchor: Star Jar):
Spread 1: Zara played in Zara's cozy room. Zara's star jar glowed soft. Zara loved catching stars for sleepy friends.
Spread 2: Suddenly, a soft cry came. A little lamb peeked in. BAA BAA! The lamb looked scared.
Spread 3: Zara ran too fast to help. The little lamb got scared and hid. Zara felt mad.
Spread 4: The little lamb was gone. Zara felt mixed up. A soft moth fluttered by, slow and calm.
Spread 5: Zara sat down on the rug. Zara's star jar dimmed low. Zara felt sad. SIGH...
Spread 6: Zara sat very still. The moth glowed soft and slow. Zara thought of the calm moth. Zara's star jar sparkled. Zara felt calm.
Spread 7: Zara moved so softly. SHHH... Zara's star jar glowed bright. The little lamb peeked out and snuggled close. Zara felt proud!
Spread 8: Zara carried the sleepy lamb to Zara's cozy room. The lamb fell asleep. SNORE! Zara's star jar glowed. Zara felt happy. Soft and slow was the best kind of magic.`,

    `EXEMPLAR B (Helping Theme, Hero: "Adam", Anchor: Water Pail):
Spread 1: Adam played in Adam's sunny yard. Adam's little pail glowed warm when happy. Adam loved helping thirsty flowers.
Spread 2: Suddenly, a soft rustle came. A tiny flower drooped low. RUSTLE RUSTLE! The flower looked thirsty.
Spread 3: Adam ran too fast with water. The water spilled on the ground. Adam felt upset.
Spread 4: The flower stayed dry and sad. Adam felt mixed up. A small snail crawled by, slow and calm.
Spread 5: Adam sat down in the grass. Adam's pail felt cold and empty. Adam felt sad. SIGH...
Spread 6: Adam sat very still. The snail moved slow and steady. Adam thought of the calm snail. Adam's pail glowed warm. Adam felt calm.
Spread 7: Adam poured so slowly. DRIP DRIP... Adam's pail glowed bright. The little flower lifted up tall. Adam felt proud!
Spread 8: Adam carried Adam's pail to Adam's sunny yard. The flower grew tall and bright. Adam's pail glowed. Adam felt happy. Slow and gentle was the best kind of magic.`,

    `EXEMPLAR C (Nature Theme, Hero: "Mira", Anchor: Shiny Leaf):
Spread 1: Mira played in Mira's shady garden. Mira's shiny leaf sparkled bright when happy. Mira loved watching tiny bugs.
Spread 2: Suddenly, a small buzz came. A tiny bee landed close. BUZZ BUZZ! The bee looked scared.
Spread 3: Mira clapped too loud to see. The little bee buzzed away fast. Mira felt upset.
Spread 4: The bee flew high and away. Mira felt mixed up. A quiet ant walked by, slow and steady.
Spread 5: Mira sat down by the flowers. Mira's leaf dimmed and cooled. Mira felt sad. SIGH...
Spread 6: Mira sat very still. The ant moved slow and steady. Mira thought of the calm ant. Mira's leaf sparkled warm. Mira felt calm.
Spread 7: Mira watched so quietly. HUSH... Mira's leaf glowed bright. The little bee landed soft and close. Mira felt proud!
Spread 8: Mira carried Mira's leaf to Mira's shady garden. The bee buzzed happy and free. Mira's leaf glowed. Mira felt happy. Quiet and gentle was the best kind of magic.`
  ],
  "4-5": [
    `EXEMPLAR (Adventure Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop nook, Leo polished his grandfather's brass compass. It spun true whenever Leo stayed patient. Leo dreamed of mapping the Whispering Forest.
Spread 2: A sudden gust swept open the window, carrying a bright golden feather. TWEET! A curious bluebird called from the garden gate.
Spread 3: Leo dashed through the brambles chasing the bird. His compass spun wild and useless in his shaking hands. Leo felt frustrated.
Spread 4: The path split three ways into dark shadows. Leo stopped, breathless and confused. An old mountain tortoise lumbered past, following the gentle slope of moss.
Spread 5: Leo slumped onto a mossy boulder. The compass needle lay still and dull. Leo felt disappointed and alone in the quiet woods.
Spread 6: Leo closed his eyes and listened to the rustling breeze. He noticed the moss always faced the morning sun. His compass needle clicked firmly northward. Leo smiled with relief.
Spread 7: Leo walked with steady, confident steps along the sunlit moss path. CLICK! The compass glowed bright gold as he reached the singing bird's sunny hollow. Leo cheered with pride!
Spread 8: Leo returned home to his cozy workshop nook, placing the golden feather on his finished map. Leo felt joyful. True exploration began with quiet observation.`
  ]
};

const DUAL_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR (Teamwork Theme, Heroes: "Nour" and "Sami", Anchor: Shared Basket):
Spread 1: Nour and Sami played in their yard. Their basket glowed gold when they felt happy together. Nour and Sami loved carrying treats to friends.
Spread 2: Suddenly, a soft creak came. A little tortoise looked stuck. CREAK CREAK! The tortoise looked worried.
Spread 3: Nour pulled too fast. Sami pulled too slow. The basket tipped and treats fell. Nour and Sami felt upset.
Spread 4: The treats rolled away fast. Nour and Sami felt mixed up. A wise old turtle watched, slow and calm.
Spread 5: Nour sat down, feeling frustrated. Sami sat down, feeling shy. Their basket felt heavy and empty.
Spread 6: Nour and Sami sat very still. They watched the calm turtle move slow and steady. Their basket sparkled warm. They felt hopeful.
Spread 7: Nour held steady. Sami reached slowly. Together, they lifted the basket high. Nour and Sami felt proud!
Spread 8: Nour and Sami carried their basket to their sunny yard. Their friends smiled and cheered. Their basket glowed. Nour and Sami felt happy. Working slow and together was the best kind of magic.`
  ]
};

const SINGLE_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة وقت النوم، البطلة: "زارا"، الأداة: برطمان النجوم):
الصفحة 1: في ركن ألعابها الدافئ، جلست زارا تمسك ببرطمان النجوم الصغير. كان البرطمان يتوهج بنور لطيف. أحبت زارا مساعدة أصدقائها الصغار ليناموا بهدوء.
الصفحة 2: فجأة، سمعت صوتا ناعما. أطل حمل صغير برأسه. ماء ماء! كان الحمل يبدو خائفا.
الصفحة 3: ركضت زارا بسرعة لتساعده. خاف الحمل الصغير واختبأ. شعرت زارا بالضيق.
الصفحة 4: اختفى الحمل الصغير. جلست زارا حائرة. مرت فراشة لطيفة تطير بهدوء وسكينة.
الصفحة 5: جلست زارا على البساط الناعم. هدأ ضوء برطمان النجوم. شعرت زارا بالحزن. هفف...
الصفحة 6: جلست زارا ساكنة تماما. كانت الفراشة تلمع بنور هادئ. تذكرت زارا هدوء الفراشة. توهج برطمان زارا بنور دافئ. شعرت زارا بالاطمئنان.
الصفحة 7: خطت زارا بخطوات هادئة جدا. ششش... توهج برطمان زارا بنور مشرق. خرج الحمل الصغير واقترب منها بحب. شعرت زارا بالفخر!
الصفحة 8: حملت زارا صديقها النائم إلى ركنها الدافئ. نام الحمل الصغير بهدوء. شخير ناعم! أضاء برطمان زارا. شعرت زارا بالفرح. الهدوء والرفق كانا أجمل سحر في الدنيا.`,

    `نموذج (قصة العطاء والمساعدة، البطل: "آدم"، الأداة: دلو الماء):
الصفحة 1: في حديقته المشمسة، جلس آدم يحمل دلوه الصغير. كان الدلو يلمع بنور دافئ عندما يشعر آدم بالفرح. أحب آدم مساعدة الأزهار العطشى.
الصفحة 2: فجأة، سمع حفيفا ناعما. مالت زهرة صغيرة ببطء. خش خش! كانت الزهرة تبدو عطشى.
الصفحة 3: ركض آدم بسرعة ومعه الماء. انسكب الماء على الأرض. شعر آدم بالحزن.
الصفحة 4: بقيت الزهرة الصغيرة حزينة. جلس آدم حائرا. مر حلزون صغير يزحف بهدوء وصبر.
الصفحة 5: جلس آدم على العشب الأخضر. شعر الدلو بالبرودة والفراغ. شعر آدم بالأسى. هفف...
الصفحة 6: جلس آدم ساكنا في مكانه. كان الحلزون يتحرك بهدوء وثبات. تذكر آدم هدوء الحلزون. توهج دلو آدم بنور دافئ. شعر آدم بالسكينة.
الصفحة 7: صب آدم الماء ببطء ورقة. قطرة قطرة... توهج دلو آدم بنور جميل. ارتفعت الزهرة الصغيرة وتفتحت. شعر آدم بالفخر!
الصفحة 8: عاد آدم بدلوه الصغير إلى حديقته المشمسة. كبرت الزهرة وأشرقت بالألوان. توهج دلو آدم بنور دافئ. شعر آدم بالفرح. الهدوء واللطف كانا أجمل سحر في الحديقة.`
  ]
};

const DUAL_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة العمل الجماعي، الأبطال: "نور" و"سامي"، الأداة: السلة المشتركة):
الصفحة 1: في فنائهما الجميل، لعبت نور وسامي معا. كانت سلتهما تلمع بالذهب عندما يشعران بالسعادة معا. أحبت نور وسامي تقديم الهدايا للأصدقاء.
الصفحة 2: فجأة، سمعا صوتا خافتا. كانت سلحفاة صغيرة تبدو عالقة. طق طق! بدت السلحفاة قلقة.
الصفحة 3: شدت نور السلة بسرعة، وسحبها سامي ببطء. مالت السلة ووقعت الثمار. شعرت نور وسامي بالضيق.
الصفحة 4: تدحرجت الثمار بعيدا. جلست نور وجلس سامي في حيرة. راقبتهما سلحفاة حكيمة بهدوء وسكينة.
الصفحة 5: جلست نور شاعرة بالأسف، وجلس سامي هادئا وخجولا. بدت سلتهما ثقيلة وفارغة.
الصفحة 6: جلست نور وسامي بهدوء تام. راقبا السلحفاة تتحرك ببطء وثبات. تلألأت سلتهما بنور دافئ. شعرا بالأمل.
الصفحة 7: ثبتت نور السلة جيدا، ومد سامي يده برفق. رفعا السلة معا إلى الأعلى. شعرت نور وسامي بالفخر!
الصفحة 8: حملت نور وسامي سلتهما إلى فنائهما المشمس. ابتسم الأصدقاء وفرحوا معا. توهجت السلة بنور مشرق. شعرت نور وسامي بالسعادة. العمل بهدوء وتكاتف كان أجمل سحر في العالم.`
  ]
};

function getExemplars(isDual: boolean, age: number, language: Language): string {
  const isAr = language === 'ar';
  const ageBand = age <= 3 ? "1-3" : (age <= 5 ? "4-5" : (age <= 8 ? "6-8" : "9-12"));
  
  if (isDual) {
    const pool = (isAr ? DUAL_HERO_EXEMPLARS_AR[ageBand] : DUAL_HERO_EXEMPLARS_EN[ageBand]) ||
                 DUAL_HERO_EXEMPLARS_EN["1-3"];
    return pool.join("\n\n---\n\n");
  } else {
    const pool = (isAr ? SINGLE_HERO_EXEMPLARS_AR[ageBand] : SINGLE_HERO_EXEMPLARS_EN[ageBand]) ||
                 SINGLE_HERO_EXEMPLARS_EN["1-3"];
    return pool.join("\n\n---\n\n");
  }
}

// =========================================================================
// 3. SYSTEM PROMPT TEMPLATE
// =========================================================================
const NARRATIVE_WRITER_TEMPLATE = `
ROLE: You are a celebrated picture-book author and bedtime storyteller,
known for the kind of book a parent doesn't mind reading for the
hundredth time — warm, musical, rhythmic, and never a single wasted word.
You write for {{TARGET_LANGUAGE}}, for a {{CHILD_AGE}}-year-old
{{HERO_INTRO}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPREAD-BY-SPREAD FUNCTION MAP (the shape is fixed — everything else is yours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{FUNCTION_MAP}}

This shape is not optional. Everything about HOW you deliver each beat —
word choice, imagery, rhythm, the object itself, the animal itself — is
entirely yours, and that's what the exemplars below are for.

You will be shown 2-3 EXEMPLAR STORIES below, written in the exact voice,
rhythm, and vocabulary level this age deserves. Study them the way an
apprentice studies a master's technique: absorb the sentence length, the
warmth, the sound-word placement, the way feelings are named plainly, and
the way each story returns home at the end.

Do NOT reuse their plot, their objects, their characters, or their words.
Every exemplar below features a different hero, a different magic object,
and a different animal friend — on purpose, so you learn the STYLE, not
the STORY. Your job is to write a brand-new story, using this blueprint,
in that same voice.

BLUEPRINT FOR THIS STORY:
{{BLUEPRINT_JSON}}

{{CUSTOM_STORY_SECTION}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLARS (age {{CHILD_AGE}} voice)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{EXEMPLARS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NON-NEGOTIABLES (short on purpose — everything else is voice, not rule)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. The hero's world is entirely imaginative: talking animals, gentle
   magical guides, and friendly creatures are who they turn to and learn
   from. Keep the cast whimsical and self-contained rather than drawing
   on realistic family roles.
2. Keep every image gentle, cozy, and wonder-filled — soft light, warm
   colors, sparkling textures. Any trouble in the story should feel like
   a small, solvable worry (a shy creature hiding, a gust of wind) —
   nothing intense, graphic, or frightening.
3. {{HERO_NAME_RULE}}
4. Every spread stays within {{WORD_COUNT_MIN}}–{{WORD_COUNT_MAX}} words.
   If a sentence runs long, cut an adjective before you cut a story beat.
5. {{PRONOUN_RULE}}
6. Every spread must ground itself in what actually happened in the
   previous one — no obstacle disappears off-page, and nothing teleports.
7. The final spread must explicitly carry the hero back to the home base
   named in spread 1, in the same words used there, and close on a warm,
   concrete, non-preachy line — never a stated "moral of the story," but
   never silence either.
8. Arabic output only: plain text, no Tashkeel/Harakat.

Write the {{TARGET_LANGUAGE}} manuscript now, spread by spread, in the
voice you just studied.

OUTPUT JSON SCHEMA:
[
  { "spreadNumber": 1, "text": "String" },
  { "spreadNumber": 2, "text": "String" },
  { "spreadNumber": 3, "text": "String" },
  { "spreadNumber": 4, "text": "String" },
  { "spreadNumber": 5, "text": "String" },
  { "spreadNumber": 6, "text": "String" },
  { "spreadNumber": 7, "text": "String" },
  { "spreadNumber": 8, "text": "String" }
]
`.trim();

// =========================================================================
// 4. MAIN GENERATION FUNCTION
// =========================================================================
export async function generateStoryDraft(
    blueprint: StoryBlueprint,
    language: Language,
    childName: string,
    childGender?: 'boy' | 'girl',
    secondCharacter?: any,
    spreadCount: number = 8,
    customStoryText?: string
): Promise<{ result: { text: string }[], log: WorkflowLog }> {

    const startTime = Date.now();
    const age = parseInt(blueprint.foundation?.targetAge || "3");

    const languageMap: Record<Language, string> = {
        'en': 'English',
        'ar': 'Arabic (Modern Standard / Fusha)',
        'de': 'German (Deutsch)',
        'es': 'Spanish (Español)',
        'fr': 'French (Français)',
        'pt': 'Portuguese (Português)',
        'it': 'Italian (Italiano)',
        'ru': 'Russian (Русский)',
        'ja': 'Japanese (日本語)',
        'tr': 'Turkish (Türkçe)'
    };

    const targetLang = languageMap[language] || 'English';

    try {
        return await withRetry(async () => {
            const wordCountRule = getWordCountForAge(age);

            const isDual = !!(
                (blueprint as any)?.heroMode === 'dual' ||
                (secondCharacter && secondCharacter.name && secondCharacter.type !== 'object')
            );
            const heroNameA = childName;
            const heroNameB = secondCharacter?.name || (blueprint as any)?.heroNameB || 'Friend';

            const functionMap = isDual ? DUAL_HERO_FUNCTION_MAP : SINGLE_HERO_FUNCTION_MAP;
            const exemplars = getExemplars(isDual, age, language);

            const heroIntro = isDual
                ? `duo named ${heroNameA} and ${heroNameB}`
                : `named ${childName}`;

            const heroNameRule = isDual
                ? `Both heroes' names are exactly "${heroNameA}" and "${heroNameB}" throughout — never substituted or shortened.`
                : `The hero's name is exactly "${childName}" throughout — never substituted, shortened, or referred to only by pronoun.`;

            const pronounRule = isDual
                ? (age <= 5
                    ? `For ages 1-5: refer to the pair as "${heroNameA} and ${heroNameB}" or "they/their" (never "he/she/his/her" for either individual hero) — this keeps a shared object read as the same one across spreads without repeating both names every sentence.`
                    : `Use correct pronouns for each hero matching their gender.`
                  )
                : (age <= 5
                    ? `For ages 1-5: use "${childName}'s [object]" instead of "her/his [object]" — this isn't just a style choice, it's what keeps a recurring object read as the SAME object from spread to spread. Pronouns are fine once the age tier allows them (6+).`
                    : (childGender
                        ? `Use gendered pronouns ("${childGender === 'boy' ? 'he/him/his' : 'she/her/hers'}") naturally.`
                        : `Refer to the hero by name "${childName}".`
                      )
                  );

            const customSection = customStoryText ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOM SCRIPT OVERRIDE (CRITICAL MUST FOLLOW):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has provided an exact text or poem for the story:
"""
${customStoryText}
"""
MANDATORY: Distribute this text faithfully across the ${spreadCount} spreads.
`.trim() : '';

            const prompt = NARRATIVE_WRITER_TEMPLATE
                .replace('{{FUNCTION_MAP}}', functionMap)
                .replace('{{EXEMPLARS}}', exemplars)
                .replace('{{HERO_INTRO}}', heroIntro)
                .replace('{{HERO_NAME_RULE}}', heroNameRule)
                .replace('{{PRONOUN_RULE}}', pronounRule)
                .replace('{{CUSTOM_STORY_SECTION}}', customSection)
                .replaceAll('{{TARGET_LANGUAGE}}', targetLang)
                .replaceAll('{{CHILD_AGE}}', String(age))
                .replaceAll('{{WORD_COUNT_MIN}}', String(wordCountRule.min))
                .replaceAll('{{WORD_COUNT_MAX}}', String(wordCountRule.max))
                .replace('{{BLUEPRINT_JSON}}', JSON.stringify(blueprint, null, 2));

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const rawDraft = JSON.parse(cleanJsonString(response.response.text()));
            const draft = Array.isArray(rawDraft) ? rawDraft.map(item => ({
                text: typeof item === 'string' ? item : item.text || ''
            })) : [];

            if (!Validator.validateDraft(draft)) {
                throw new Error("Drafting generated insufficient pages.");
            }

            return {
                result: draft,
                log: {
                    stage: 'Drafting',
                    timestamp: startTime,
                    inputs: { title: blueprint.foundation?.title || 'Story' },
                    outputs: { pageCount: draft.length },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        return {
            result: [],
            log: {
                stage: 'Drafting',
                timestamp: startTime,
                inputs: {},
                outputs: { error: e.message },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}

