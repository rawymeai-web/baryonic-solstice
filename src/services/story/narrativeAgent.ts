import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { getWordCountForAge } from '../rules/guidebook';
import { StoryBlueprint, WorkflowLog, Language } from '../../types';

// =========================================================================
// 1. SPREAD-BY-SPREAD FUNCTION MAPS (DYNAMIC ARCHETYPES)
// =========================================================================

// Toddler 3-Beat Board Book Arc (Ages 1-3)
export const TODDLER_SINGLE_HERO_FUNCTION_MAP = `
Spread 1 — Home Base & Hero: Name the hero and their cozy home base (room, rug, yard).
Spread 2 — Gentle Desire: Introduce the hero's gentle goal, favorite game, picnic, or keepsake.
Spread 3 — Playful Catalyst: A friendly creature, sound, or playful surprise appears from the home base.
Spread 4 — Small Trouble: A gentle snag occurs (a toy tips, a pet hides, or blocks wobble).
Spread 5 — Stillness & Low Point: The hero pauses and rests. Name the primary feeling plainly ("felt sad", "sat still").
Spread 6 — Calm Insight: The hero tries a gentle, quiet, or steady approach.
Spread 7 — Happy Success: The creature returns, the picnic is saved, or the puzzle clicks into place! The hero feels proud and happy.
Spread 8 — Cozy Bedtime Close: The hero rests happily in their cozy home base. Warm, sweet bedtime close (no adult proverb).
`.trim();

export const TODDLER_DUAL_HERO_FUNCTION_MAP = `
Spread 1 — Home Base & Both Heroes: Name both heroes and their shared cozy home base (room, yard).
Spread 2 — Shared Motive: Introduce their shared game, exploration, or shared toy.
Spread 3 — Playful Catalyst: A playful challenge or friendly creature appears.
Spread 4 — Small Trouble: A slight snag or difference in speed (one fast, one slow; or a toy tips).
Spread 5 — Stillness & Low Point: Both heroes sit down together. Name their feelings simply ("felt sad", "felt shy").
Spread 6 — Calm Insight: Both heroes smile, hold hands, and coordinate together.
Spread 7 — Happy Success: Together with synchronized teamwork, both succeed! Both feel proud and joyful.
Spread 8 — Cozy Bedtime Close: Both return to their cozy home base for a sweet, happy rest together.
`.trim();

// Standard 5-Beat Arc (Ages 4+)
export const SINGLE_HERO_FUNCTION_MAP = `
Spread 1 — Ground & Introduce: Name the hero, their home base, and why THIS goal matters to them specifically. If an anchor prop is used, introduce its physical rule; if social/exploratory, ground the setting and motive.
Spread 2 — Catalyst: The problem, mystery, or invitation appears, sensed from the home base (a sound, a sight, an invitation).
Spread 3 — First Attempt: The hero tries their natural approach, and it encounters an obstacle or complication.
Spread 4 — Complication: The challenge deepens. A natural sign, clue, or optional helper guide may appear.
Spread 5 — Low Point: The hero's lowest emotional beat, named directly ("felt sad," "felt puzzled," not just physical labels).
Spread 6 — Insight: The hero notices something through careful observation or deduction, realizing the right approach.
Spread 7 — Climax: The hero acts on the insight and succeeds through their OWN effort. Fulfill the exact promise made in the title/Spread 1!
Spread 8 — Return & Close: An explicit bridge back to Spread 1's home base, ending on a warm, scene-based, non-preachy character moment (hug, shared laugh, placed keepsake, cozy smile).
`.trim();

export const DUAL_HERO_FUNCTION_MAP = `
Spread 1 — Ground & Introduce Both: Name both heroes, their relationship, their shared home base, and why this goal matters to them.
Spread 2 — Catalyst: The problem or adventure appears. If one hero arrives rather than starting the scene, give them a warm on-screen entrance here.
Spread 3 — First Attempt: The heroes try to tackle the challenge and encounter friction or an unexpected obstacle.
Spread 4 — Complication: The situation escalates. Both heroes contribute distinct perspectives or skills.
Spread 5 — Low Point: EACH hero gets their own named feeling (not identical). They pause to regroup.
Spread 6 — Insight: Both heroes coordinate, combining clue A and clue B or agreeing on a synchronized plan.
Spread 7 — Climax: BOTH heroes act in synergy. Each performs an INDISPENSABLE action that only they could bring. Fulfill the title/premise promise!
Spread 8 — Return & Close: Both return together; the close reflects their shared friendship in a cozy scene-based ending without preachy adult proverbs.
`.trim();

// =========================================================================
// 2. GOLD STANDARD EXEMPLARS (EN & AR) - DE-TEMPLATIZED & NON-PREACHY
// =========================================================================

const SINGLE_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR A (Bedtime Theme, Hero: "Zara", Keepsake: Star Box):
Spread 1: Zara plays on her soft bedroom rug.
Spread 2: Zara holds her wooden star box. Two hands twist the lid to click open.
Spread 3: TAP TAP! A tiny white lamb peeks through the door.
Spread 4: Zara pulls fast with one hand. The wooden lid stays stuck. The shy lamb hides away.
Spread 5: Zara sits down on the rug. Zara feels sad.
Spread 6: Zara sits quiet and calm. Zara uses two hands and turns slowly. CLICK!
Spread 7: The box opens with soft starlight. The lamb hops close and snuggles in Zara's lap.
Spread 8: Zara hugs the sleepy lamb on the soft rug. Sweet dreams, little star!`,

    `EXEMPLAR B (Daily Life Picnic, Hero: "Lina", Setting: Garden):
Spread 1: Lina sets a red blanket on the green grass.
Spread 2: Lina unpacks three shiny wooden apples for her toy bears.
Spread 3: A yellow butterfly flutters over the picnic cups.
Spread 4: Lina reaches fast! The wooden cups tip over on the blanket.
Spread 5: Lina sits down by the flowers. Lina feels sad.
Spread 6: Lina sits still and sets the cups upright. Lina smiles gently.
Spread 7: The butterfly lands softly right on Lina's wooden apple!
Spread 8: Lina giggles on the soft grass with her teddy bears. The picnic is ready.`
  ],
  "4-5": [
    `EXEMPLAR A (Adventure Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop, Leo polished his brass compass. Its needle pointed true north only when held flat away from iron buckles.
Spread 2: A sudden breeze swept inside, carrying a bright golden feather. TWEET! A curious bluebird called from the garden gate.
Spread 3: Leo dashed outside chasing the bird, gripping the compass right against his iron belt buckle. The needle spun wild and crooked. Leo felt frustrated.
Spread 4: The forest path split into three leafy turns. CRUNCH! A calm mountain turtle crawled slowly past, heading toward the sunlit moss.
Spread 5: Leo sat down on a mossy boulder. The needle stayed jammed sideways against the iron buckle. Leo felt disappointed. SIGH...
Spread 6: Leo noticed how the turtle moved without any metal clinking. He unclasped his belt and laid the compass flat on wood. CLICK! The needle swung smoothly north.
Spread 7: Leo walked with steady steps along the sunlit moss path. TWEET! He found the singing bluebird safe in its hollow. Leo cheered proudly!
Spread 8: Leo returned to his sunlit workshop, placing the golden feather in his sketchbook. Leo smiled and closed his sketchbook for the night.`,

    `EXEMPLAR B (School / Friendship Theme, Hero: "Sami", Setting: Art Room):
Spread 1: Sami stood by the easel in the busy school art room. Sami loved mixing watercolors to paint soaring kites.
Spread 2: Across the room, a group of children laughed as they painted a giant wall mural of an ocean bay.
Spread 3: Sami stepped forward holding his blue brush, but hesitated at the edge of the circle. Sami felt shy and worried.
Spread 4: The ocean mural had rolling waves and sandy shores, but no ships sailed across the water.
Spread 5: Sami sat on the wooden stool by his easel. Sami felt left out and quiet.
Spread 6: Sami noticed the corner of the mural needed a bright sail. He took a gentle breath, walked over, and dipped his brush in cheerful red paint.
Spread 7: Sami painted a bold, sailing ship across the blue waves. The other children cheered and passed him their yellow paint pots!
Spread 8: Sami hung his paint apron on the peg as the afternoon bell rang. Sami walked home with colorful fingers and a happy smile.`
  ],
  "6-8": [
    `EXEMPLAR A (Discovery Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop nook, Leo examined his brass pocket compass. The balanced needle aligned true north only when rested completely level away from iron tools. Leo dreamed of mapping the hidden Whispering Ridge.
Spread 2: A sudden gust swept open the window shutters, blowing in a bright golden feather. TWEET! A bluebird called from the orchard gate, beckoning Leo to follow.
Spread 3: Leo dashed through the brambles chasing the fluttering feather, waving his heavy iron trowel in the same hand as his compass. The magnetic needle spun frantically in useless circles. Leo felt angry and frustrated by his haste.
Spread 4: The trail split into three shadowy forks under the dense pines. Leo stood breathless and confused. An old mountain tortoise ambled steadily across the pine needles toward the bright mossy clearing.
Spread 5: Leo slumped onto a granite boulder. He dropped his heavy iron tools in the dirt. The compass needle remained frozen off-center. Leo felt defeated and lonely in the quiet forest. SIGH...
Spread 6: Leo watched the tortoise follow the natural slope of the ground. Leo realized the iron trowel had pulled the magnetic needle off course. He set the trowel aside and placed the compass flat on a cedar stump. CLICK! The needle swung freely and locked onto true north.
Spread 7: Leo marched with calm, steady strides toward the north clearing. He reached the bird's hollow just as the afternoon sun lit the golden feather nest. Leo cheered triumphantly!
Spread 8: Leo returned home to his cozy workshop nook, pinning the golden feather above his drawing desk. He placed the compass in its velvet pouch, ready for tomorrow's map.`,

    `EXEMPLAR B (Lost & Found Workshop, Hero: "Yusuf", Anchor: Model Clipper Ship):
Spread 1: In his grandfather's sunny carpentry workshop, Yusuf smoothed the cedar hull of his model clipper ship. He only needed the white linen mainsail to finish the vessel for the regatta.
Spread 2: A gust of harbor wind whistled through the open doorway, blowing his grandfather's blueprint rolls and workshop scrap bins across the floor.
Spread 3: Yusuf rummaged frantically through the wood shavings and tool chests, tossing aside sandpaper and rope spools. The sail was nowhere in sight. Yusuf felt anxious and frustrated.
Spread 4: Shadows lengthened across the workbench. Yusuf found torn wrapping papers, but none were strong enough to serve as sailcloth.
Spread 5: Yusuf leaned his elbows on the cedar workbench. Without the sail, the ship could not enter the harbor showcase. Yusuf felt discouraged and tired.
Spread 6: Yusuf paused and tidied the bench step by step. Beneath a stack of dried canvas sailcloth swatches, he spotted a neatly rolled linen square tucked beside the wooden mallet.
Spread 7: Yusuf fitted the linen sail onto the miniature cedar mast, securing the brass eyelets with taut hemp string. CLICK! The sail swelled crisp and proud in the afternoon light.
Spread 8: Yusuf placed the finished clipper ship on the mantelpiece above the fireplace. The polished wood gleamed warmly in the evening glow.`
  ],
  "9-12": [
    `EXEMPLAR (Discovery Theme, Hero: "Tariq", Anchor: Silver Astrolabe):
Spread 1: High in his attic observatory, Tariq inspected his silver astrolabe beside the brass skylight. The instrument's horizon ring rotated smoothly only when aligned with the engraved water-level groove. Tariq was determined to chart the rare Comet of the Bay before midnight.
Spread 2: A sudden trail of emerald sparks flashed across the harbor sky. WHOOSH! A sea hawk glided past the stone balustrade, angling its wings toward the coastal cliffs.
Spread 3: Tariq bolted down the spiral staircase, sprinting across the wet cobblestones while forcing the astrolabe dial with a heavy wrench. The silver gear teeth jammed tight in the casing. Tariq felt furious at his reckless haste.
Spread 4: The emerald spark faded behind dense maritime fog. Tariq stood stranded among the sharp tidal rocks, unable to measure the comet's trajectory. A harbor seal surfaced smoothly in the calm water, resting motionless against the current.
Spread 5: Tariq leaned against a cold seawall, dropping his heavy tools into his satchel. The silver astrolabe was locked solid. Tariq felt crushed and ready to abandon the expedition in bitter disappointment.
Spread 6: Tariq watched the seal's unhurried balance in the swell. He realized forcing the dial had jammed the calibration pin. Tariq cleared the sea spray, loosened the brass thumbscrew, and aligned the horizon ring with the true sea level. CLINK! The precision gears clicked into seamless motion.
Spread 7: Tariq measured the exact elevation angle with steady precision. The astrolabe aligned with the emerald comet trail, revealing the forgotten sea cave observatory. Tariq shouted with triumphant pride!
Spread 8: Tariq climbed back to his attic observatory as harbor bells chimed midnight across the bay. He penned the final comet coordinates into his leather journal, gazing peacefully out at the calm ocean.`
  ]
};

const DUAL_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR (Teamwork Theme, Heroes: "Nour" and "Sami", Anchor: Shared Basket):
Spread 1: Nour and Sami play in their sunny yard.
Spread 2: Their woven berry basket has two smooth handles. Two hands on each side keep it level.
Spread 3: A little garden bunny hops by the strawberry patch.
Spread 4: Nour pulls fast, but Sami steps slow. The basket tips sideways! Red berries roll away on the grass.
Spread 5: Nour and Sami sit down on the grass. Nour feels sad. Sami feels shy.
Spread 6: Nour and Sami hold hands. They grasp each handle together and count: One, two, three!
Spread 7: Together, Nour and Sami lift the basket level. The little bunny hops close and nibbles a sweet berry.
Spread 8: Nour and Sami eat sweet strawberries together on the grass. The afternoon sun shines warm.`
  ],
  "4-5": [
    `EXEMPLAR (School Friendship Theme, Heroes: "Omar" and "Mariam", Setting: Kindergarten Yard):
Spread 1: Omar and Mariam met at the kindergarten sandbox. Omar held a blue bucket and Mariam carried two wooden shovels.
Spread 2: At the center of the yard, three classmates were building a sand castle with a deep moat that needed a bridge.
Spread 3: Omar rushed to drop sand on the moat, but the dry sand crumbled into the water. Omar felt disappointed.
Spread 4: Mariam knelt beside the moat. The classmates watched, wondering if their castle would ever have a bridge.
Spread 5: Omar sat on the wooden sandbox ledge. Mariam stood with her shovels, feeling puzzled and shy.
Spread 6: Mariam noticed the damp sand near the water pump packed tight. Mariam showed Omar how to pat the wet sand flat into sturdy arches.
Spread 7: Working side by side, Mariam smoothed the arch while Omar placed flat pebble stones across the top. The bridge held firm, and all their classmates cheered!
Spread 8: Omar and Mariam wiped their hands on their smocks as recess ended. They walked into the classroom laughing together.`
  ],
  "6-8": [
    `EXEMPLAR (Adventure Partnership, Heroes: "Leo" and "Maya", Setting: Island Treasure Hunt):
Spread 1: In their treehouse lookout, Leo and Maya studied their grandfather's pirate parchment. The map promised a hidden chest of golden coins buried beneath the Whispering Palm.
Spread 2: A sudden coastal breeze rustled the palms outside, revealing a carved stone marker half-buried in the shoreline dunes.
Spread 3: Leo sprinted to the stone and tugged violently at the tangled roots, but the heavy slab would not budge. Leo felt hot-tempered and annoyed.
Spread 4: Maya inspected the stone's carvings. Four circular indentations formed a riddle border around a brass dial.
Spread 5: Leo slumped on the driftwood log. Maya sat beside the dune grass, tracing the symbols. Both felt frustrated and stuck.
Spread 6: Maya noticed the riddle matched the sea-shell shapes in her pocket satchel. Maya placed the four shells in order, while Leo levered the brass dial with a flat cedar stick. CLICK!
Spread 7: Working in perfect synergy, Maya held the brass catch open while Leo hoisted the stone lid. Inside the chest gleamed ancient golden coins and a brass spyglass! Leo and Maya cheered together!
Spread 8: Leo and Maya walked along the sunset beach carrying their golden pirate coins. They shared the brass spyglass, watching the evening stars rise over the ocean.`
  ],
  "9-12": [
    `EXEMPLAR (Scholarly Teamwork, Heroes: "Karim" and "Hana", Anchor: Bronze Chronometer):
Spread 1: In the sun-drenched library of the coastal academy, Karim and Hana examined their antique bronze chronometer. The chronometer's dual escapement gears ticked in unison only when both scholars lowered their counterweight levers simultaneously. They aimed to decode the ancient maritime chart before dawn.
Spread 2: A sudden sea breeze swept through the stone gallery, rustling parchment scrolls. A shimmering golden dragonfly darted across the courtyard sundial before disappearing into the archive vaults.
Spread 3: Karim insisted on forcing the main gear to rush ahead, while Hana tugged the timing wheel backward. Their conflicting forces sheared the alignment pin, freezing the chronometer with a sharp clatter. Karim felt bitter frustration, and Hana felt angry.
Spread 4: Deep in the archive vaults, shadows lengthened between towering bookcases. Karim and Hana stood stranded at a dead end of stone arches. A seasoned library cat trotted past, pausing at the threshold of an acoustic chamber to listen to the ocean tide.
Spread 5: Karim slumped against leather folios. Hana sat on the stone bench, staring at the locked chronometer gears. Both felt sorrowful and quiet.
Spread 6: Karim and Hana observed how the cat waited for the rhythm of the waves. Karim apologized for his hasty force, and Hana shared her timing notes. Together, they aligned their levers and released the counterweights at the exact same instant. CHIME!
Spread 7: Hana tracked the acoustic echoes while Karim calibrated the celestial coordinates on the ticking chronometer. CLICK! The internal cylinder slid open, revealing the lost navigational route. Karim and Hana high-fived with proud relief!
Spread 8: Karim and Hana walked back to the sun-drenched academy gallery, delivering the parchment to the ship captains as harbor horns sounded at dawn. They sat by the sunny window, enjoying warm mint tea together.`
  ]
};

const SINGLE_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة وقت النوم، البطلة: "زارا"، التحفة: برطمان النجوم الخشبي):
الصفحة 1: تلعب زارا فوق بساط غرفتها الناعم.
الصفحة 2: تحمل زارا برطمان النجوم الخشبي الصغير.
الصفحة 3: طق طق! أطل حمل صغير أبيض من خلف الباب.
الصفحة 4: سحبت زارا الغطاء بيد واحدة بقوة، فبقي الغطاء مغلقا. خاف الحمل واختبأ.
الصفحة 5: جلست زارا على البساط. شعرت زارا بالحزن.
الصفحة 6: جلست زارا بهدوء. أمسكت الغطاء بكلتا يديها ودارت برفق.
الصفحة 7: انفتح البرطمان ببريق ناعم. قفز الحمل الصغير وجلس في حضن زارا بسعادة.
الصفحة 8: احتضنت زارا الحمل الصغير فوق بساط غرفتها الناعم. نامت زارا في سريرها الدافئ.`,

    `نموذج (قصة نزهة الحديقة، البطل: "آدم"، المكان: الحديقة المشمسة):
الصفحة 1: يفرش آدم بساطا أحمر فوق العشب الأخضر.
الصفحة 2: يرتب آدم ثلاثة أطباق خشبية لدميته الدب.
الصفحة 3: طارت فراشة صفراء جميلة وحطت قرب الأكواب.
الصفحة 4: مد آدم يده بسرعة! مالت الأكواب فوق البساط.
الصفحة 5: جلس آدم قرب الأزهار. شعر آدم بالحزن.
الصفحة 6: جلس آدم هادئا وأعاد الأكواب مكانها بابتسامة لطيفة.
الصفحة 7: حطت الفراشة الصفراء برفق فوق تفاحة آدم الخشبية!
الصفحة 8: ابتسم آدم فوق العشب الأخضر مع دبابه اللطيفة، وتناول شطيرته اللذيذة.`
  ],
  "4-5": [
    `نموذج (قصة الاستكشاف، البطل: "ليث"، الأداة: البوصلة النحاسية):
الصفحة 1: في ركن ورشته المشمس، جلس ليث يتأمل بوصلته النحاسية. كانت إبرتها تستقر نحو الشمال فقط عندما يمسكها مستوية بعيدا عن مشابك الحزام الحديدي.
الصفحة 2: هبت نسمة هواء عبر النافذة وحملت ريشة ذهبية براقة. زقزق عصفور أزرق جميل عند بوابة الحديقة داعيا ليث لملاحقته.
الصفحة 3: ركض ليث بسرعة ممسكا البوصلة قرب حزامه الحديدي. دارت الإبرة باضطراب دون اتجاه ثابت. شعر ليث بالضيق.
الصفحة 4: تفرقت المسارات بين ظلال الأشجار. مرت سلحفاة جبلية تمشي بهدوء وثبات نحو العشب الأخضر.
الصفحة 5: جلس ليث على صخرة هادئة. بقيت الإبرة مائلة نحو مشبك الحزام. شعر ليث بالتردد والحزن.
الصفحة 6: راقب ليث مسار السلحفاة. فك ليث حزامه ووضع البوصلة مستوية فوق الصخرة. طق! استقرت الإبرة بدقة نحو الشمال.
الصفحة 7: مشى ليث بخطوات ثابتة متبعا اتجاه الإبرة. وجد عش العصفور سالما بين الأغصان، وهتف بفرح!
الصفحة 8: عاد ليث بريشته الذهبية إلى ورشته المشمسة، ووضعها بعناية في دفتر رسوماته قبل أن ينام.`,

    `نموذج (قصة الروضة والمشاركة، البطل: "عمر"، المكان: باحة الروضة):
الصفحة 1: وقف عمر في باحة الروضة يحمل مجسم قارب صغير من الورق المقوى.
الصفحة 2: تجمع الأطفال حول حوض الماء الكبير يطلقون زوارقهم الخشبية وسط ضحكات مرحة.
الصفحة 3: تقدم عمر بخطوات مترددة نحو الحوض، ثم توقف خجلا من طلب الانضمام إليهم.
الصفحة 4: تدافعت المياه وانحرف أحد الزوارق الخشبية الصغيرة وعلق بين الصخور الملساء.
الصفحة 5: جلس عمر على المقعد الخشبي القريب ووضع قاربه في حجره. شعر عمر بالخجل والوحدة.
الصفحة 6: نظرت مريم إلى عمر وابتسمت له بلطف. أشارت مريم إلى قاربه وقالت: ما أجمل شراعك يا عمر!
الصفحة 7: تقدم عمر مسرورا واستخدم قاربه بخفة ليحرر الزورق العالق. صفق الأطفال معا بفرح غامر!
الصفحة 8: جلس عمر ومريم يطلقان قواربهما جنبا إلى جنب في الماء، وضحكا تحت شمس الصباح الدافئة.`
  ],
  "6-8": [
    `نموذج (قصة الكنز والشراكة، الأبطال: "ليث" و"ميس"، المكان: شاطئ الجزيرة):
الصفحة 1: في بيتهما الشجري الصغير، تفحص ليث وميس خريطة قديمة ترشدهما إلى صندوق الكنز الذهبي عند شاطئ النخيل.
الصفحة 2: هبت ريح بحرية منعشة، وكشفت عن صخرة منقوشة نصف مدفونة تحت رمال الشاطئ.
الصفحة 3: اندفع ليث وجذب الصخرة بقوة وتسرع، لكنها ظلت ثابتة في مكانها. شعر ليث بالضيق.
الصفحة 4: انحنت ميس تتأمل نقوش الصخرة الدقيقة. كانت هناك أربعة تجاويف دائرية تحيط بقفل نحاسي.
الصفحة 5: جلس ليث على جذع شجرة ملقى، وجلست ميس تفكر في النقوش. شعر كلاهما بالحيرة والتعب.
الصفحة 6: لاحظت ميس أن النقوش تطابق أشكال الأصداف الملونة في حقيبتها. رتبت ميس الأصداف، بينما أدار ليث المفتاح النحاسي برفق. طق!
الصفحة 7: بتعاون مشترك، رفعت ميس الغطاء الصخري بينما سحب ليث الصندوق القديم. لمعت العملات الذهبية القديمة تحت أشعة الشمس!
الصفحة 8: عاد ليث وميس إلى بيتهما الشجري يحملان العملات الذهبية ومنظارا نحاسيا عتيقا، وشاركا حكايتهما المشوقة مع الأصدقاء.`
  ],
  "9-12": [
    `نموذج (قصة ورشة السفن المفقودة، البطل: "يوسف"، الأداة: مجسم السفينة الشراعية):
الصفحة 1: في ورشة النجارة الهادئة، عكف يوسف على صقل خشب الأرز لمجسم سفينته البحرية تمهيدا للمشاركة في معرض الميناء السنوي.
الصفحة 2: هبت عاصفة بحرية خفيفة عبر النافذة وبعثرت لفائف التصاميم والقطع الخشبية الصغيرة في أرجاء المكان.
الصفحة 3: اندفع يوسف يبحث بين الصناديق بتوتر عن الشراع القماشي الأبيض المفقود، مبعثرا الأدوات. شعر يوسف بالقلق والاضطراب.
الصفحة 4: وجد يوسف أوراق تغليف مهترئة، لكنها لم تكن صالحة لحمل الرياح فوق سارية السفينة.
الصفحة 5: أسند يوسف ظهره إلى طاولة العمل. بدون الشراع الأصلي، لن تبحر السفينة. شعر يوسف بالإحباط والحزن.
الصفحة 6: توقف يوسف وتنفس بعمق، وبدأ بترتيب الطاولة بهدوء وتنظيم. أسفل صندوق القماش الكتاني، لمح لفة الشراع الأصلي مطوية بعناية.
الصفحة 7: ثبت يوسف الشراع الأبيض المشدود بإحكام على سارية الأرز بواسطة الخيوط الملاحية الدقيقة. طق! استقر الشراع ناصعا وبديعا في موضعه.
الصفحة 8: وضع يوسف سفينته الشراعية المكتملة فوق الرف الخشبي بجوار النافذة، وابتسم وهو يراقب أضواء الميناء الهادئة في المساء.`
  ]
};

function getExemplars(isDual: boolean, age: number, language: Language): string {
  const isAr = language === 'ar';
  const ageBand = age <= 3 ? "1-3" : (age <= 5 ? "4-5" : (age <= 8 ? "6-8" : "9-12"));
  
  const poolMap = isDual 
    ? (isAr ? DUAL_HERO_EXEMPLARS_EN : DUAL_HERO_EXEMPLARS_EN)
    : (isAr ? SINGLE_HERO_EXEMPLARS_AR : SINGLE_HERO_EXEMPLARS_EN);

  // For Arabic dual hero, fallback gracefully to Arabic single or adapted English
  let pool: string[] | undefined = poolMap[ageBand];
  if (!pool || pool.length === 0) {
    const fallbackOrder = [ageBand, "6-8", "4-5", "1-3"];
    for (const band of fallbackOrder) {
      if (poolMap[band] && poolMap[band].length > 0) {
        pool = poolMap[band];
        break;
      }
    }
  }
  if (!pool || pool.length === 0) {
    pool = isDual ? DUAL_HERO_EXEMPLARS_EN["4-5"] : SINGLE_HERO_EXEMPLARS_EN["4-5"];
  }
  return pool.join("\n\n---\n\n");
}

// =========================================================================
// 3. SYSTEM PROMPT TEMPLATE
// =========================================================================
const NARRATIVE_WRITER_TEMPLATE = `
ROLE: You are a celebrated picture-book author and bedtime storyteller,
known for the kind of book a parent loves reading aloud — warm, musical,
rhythmic, delightfully specific, and never a single wasted word.
You write for {{TARGET_LANGUAGE}}, for a {{CHILD_AGE}}-year-old
{{HERO_INTRO}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPREAD-BY-SPREAD FUNCTION MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{FUNCTION_MAP}}

This shape provides the emotional skeleton. Everything about HOW you deliver each beat —
vivid child dialogue, sensory details, childlike humor, and cadence — is yours.

You will be shown EXEMPLAR STORIES below, written in the voice, rhythm, and vocabulary
this age deserves. Learn their style, sensory joy, and natural pacing.

Do NOT copy their exact plot, objects, or characters. Write an original story faithful
to the provided Blueprint.

BLUEPRINT FOR THIS STORY:
{{BLUEPRINT_JSON}}

{{HERO_DESIRE_SECTION}}

{{ANCHOR_TRIGGER_SECTION}}

{{CUSTOM_STORY_SECTION}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLARS (age {{CHILD_AGE}} voice)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{EXEMPLARS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NON-NEGOTIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CHILD-LED WORLD: The story centers on the hero's discovery, friendship, and imagination.
   Keep domestic parental figures off-screen so the child is the active hero who solves the challenge.
2. COZY & WONDER-FILLED: Keep problems solvable and child-scaled. No graphic danger or intense distress.
3. {{HERO_NAME_RULE}}
4. WORD COUNT BOUNDS: Strictly {{WORD_COUNT_MIN}}–{{WORD_COUNT_MAX}} visible words per spread.
   Keep text rhythmic and musical. NEVER strip out the fun, playful details into dry, telegram-like fragments!
5. {{PRONOUN_RULE}}
6. CAUSAL CONTINUITY: Every spread must causally link to the previous spread. No teleporting.
7. SCENE-BASED ENDING (ANTI-PREACHY RULE):
   - The final spread MUST end on a concrete character action, dialogue, or cozy bedtime resolution (a hug, tucking in a toy, looking at the stars, a proud smile).
   - ❌ STRICTLY FORBIDDEN: NEVER write an adult sermon or moral formula (NEVER write "Patience is...", "He learned that...", "The moral of the story", "لأن الصبر هو أفضل سر"). Let the child feel the resolution through the scene.
8. PROMISE-VERSUS-PAYOFF:
   - What is promised in Spread 1 and the Title MUST be delivered in the climax (Spread 7).
   - If a special anchor tool is present, its operation must follow concrete, observable physical cause-and-effect (clicking, turning, balancing). Zero emotion-reading magic.
   - Objects must obey realistic physical continuity (e.g. paper cannot magically be canvas sailcloth without crafting).
9. ORGANIC SOUND WORDS (BUDGET 0–4 ACROSS STORY):
   - Sound words are optional and organic. Use 0 to 4 natural sounds across the entire book, motivated by real physical actions (tap tap, whoosh, click, splash, sigh).
   - Do NOT force a sound on every spread.
   - ❌ BANNED: Never use parenthetical emotional exclamations like "(وااااه!)" or "(وخزة!)" or invented gibberish sounds like "فر".
10. CLICHÉ PLOT BAN: Strictly ban cliché "fear of the dark" or "scary shadows turning out to be toys" plots.
11. EMOTION-ACTION NON-REDUNDANCY: Narrate feelings and physical mechanics cleanly without redundant repeats.
12. ARABIC OUTPUT RULES:
    - Use clean, modern, child-accessible Fusha (فصحى معاصرة رقيقة ومحببة للأطفال).
    - Natural Arabic phrasing: avoid literal word-for-word translations of English idioms.
    - Strictly avoid colloquial words (no "دفش") and heavy adult rhetoric.
    - 100% strict gender agreement matching the hero ({{CHILD_GENDER_ARABIC}}).
    - Plain text only, 100% free of Tashkeel / Harakat.
{{AGE_SPECIFIC_RULES}}

Write the {{TARGET_LANGUAGE}} manuscript now, spread by spread.

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

            const functionMap = age <= 3
                ? (isDual ? TODDLER_DUAL_HERO_FUNCTION_MAP : TODDLER_SINGLE_HERO_FUNCTION_MAP)
                : (isDual ? DUAL_HERO_FUNCTION_MAP : SINGLE_HERO_FUNCTION_MAP);

            const exemplars = getExemplars(isDual, age, language);

            const heroIntro = isDual
                ? `duo named ${heroNameA} and ${heroNameB}`
                : `named ${childName}`;

            const heroNameRule = isDual
                ? `Both heroes' names are exactly "${heroNameA}" and "${heroNameB}" throughout — never substituted or shortened. Both heroes must actively participate.`
                : `The hero's name is exactly "${childName}" throughout — never substituted, shortened, or referred to only by pronoun.`;

            const pronounRule = isDual
                ? (age <= 5
                    ? `For ages 1-5: refer to the pair as "${heroNameA} and ${heroNameB}" or "they/their" — never "he/she/his/her" for either individual hero.`
                    : `Use correct pronouns for each hero matching their gender.`
                  )
                : (age <= 5
                    ? `For ages 1-5: use "${childName}'s [item]" instead of "her/his [item]" to keep object continuity clear. Avoid 3rd-person pronouns.`
                    : (childGender
                        ? `Use gendered pronouns ("${childGender === 'boy' ? 'he/him/his' : 'she/her/hers'}") naturally.`
                        : `Refer to the hero by name "${childName}".`
                      )
                  );

            const primaryAnchor = blueprint.foundation?.primaryVisualAnchor || 'None';
            const hasAnchor = primaryAnchor.toLowerCase() !== 'none';
            const heroDesire = blueprint.foundation?.heroDesire || '';
            const activeAnchorRule = blueprint.foundation?.anchorTriggerRule || '';

            const anchorRuleSection = (hasAnchor && activeAnchorRule && activeAnchorRule.toLowerCase() !== 'none') ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANCHOR OBJECT PHYSICAL TRIGGER RULE (OPTIONAL PROP):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Anchor Object: "${primaryAnchor}"
Trigger Mechanics: "${activeAnchorRule}"
Introduce its physical behavior in Spread 1/2. Show how careful handling operates it physically.
`.trim() : '';

            const heroDesireSection = heroDesire ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HERO CORE DESIRE & SPREAD 1 MOTIVE (MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Desire/Goal: "${heroDesire}"
Spread 1 MUST ground this desire in the child's home base and make it a personal, heartfelt wish.
`.trim() : '';

            const customSection = customStoryText ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOM SCRIPT OVERRIDE (CRITICAL MUST FOLLOW):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has provided an exact text or poem for the story:
"""
${customStoryText}
"""
MANDATORY: Distribute this text faithfully across the ${spreadCount} spreads. DO NOT alter the provided words.
`.trim() : '';

            const ageSpecificRules = age <= 3
                ? `13. TODDLER BOARD BOOK RULES (AGES 1–3):
   - Strictly ${wordCountRule.min}–${wordCountRule.max} words per spread. Every spread delivers ONE clear visual/emotional idea.
   - 3-BEAT SHAPE: Want (Spreads 1-3) -> Try & Gentle Snag/Recovery (Spreads 4-6) -> Got it & Cozy Rest (Spreads 7-8).
   - NO SUBORDINATE CLAUSES: Strictly cut "because", "so that", "in order to".
   - RETAIN DELIGHT: Keep playful, rhythmic charm. Do NOT produce flat, telegram-style fragments.`
                : `13. AGE ${age} PACING: Clear cause-and-effect flow, sensory grounding, and natural conversational cadence within ${wordCountRule.min}–${wordCountRule.max} words per spread.`;

            const prompt = NARRATIVE_WRITER_TEMPLATE
                .replace('{{FUNCTION_MAP}}', functionMap)
                .replace('{{EXEMPLARS}}', exemplars)
                .replace('{{HERO_INTRO}}', heroIntro)
                .replace('{{HERO_NAME_RULE}}', heroNameRule)
                .replace('{{PRONOUN_RULE}}', pronounRule)
                .replace('{{HERO_DESIRE_SECTION}}', heroDesireSection)
                .replace('{{ANCHOR_TRIGGER_SECTION}}', anchorRuleSection)
                .replace('{{CUSTOM_STORY_SECTION}}', customSection)
                .replace('{{AGE_SPECIFIC_RULES}}', ageSpecificRules)
                .replaceAll('{{TARGET_LANGUAGE}}', targetLang)
                .replaceAll('{{CHILD_AGE}}', String(age))
                .replaceAll('{{WORD_COUNT_MIN}}', String(wordCountRule.min))
                .replaceAll('{{WORD_COUNT_MAX}}', String(wordCountRule.max))
                .replace('{{CHILD_GENDER_ARABIC}}', childGender === 'girl' 
                    ? 'Hero is a girl (مؤنث) - use 100% consistent feminine verbs: جلست، نظرت، شعرت، فكرت' 
                    : 'Hero is a boy (مذكر) - use 100% consistent masculine verbs: جلس، نظر، شعر، فكر')
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

            const qualityCheck = Validator.validateDraftQuality(draft, {
                expectedLength: draft.length,
                childAge: age,
                childName,
                secondCharacterName: secondCharacter?.name,
                isDual,
                language,
                anchorTriggerRule: hasAnchor ? activeAnchorRule : undefined,
                primaryVisualAnchor: hasAnchor ? primaryAnchor : undefined,
                customStoryText
            });

            return {
                result: draft,
                log: {
                    stage: 'Drafting',
                    timestamp: startTime,
                    inputs: { title: blueprint.foundation?.title || 'Story' },
                    outputs: { 
                        pageCount: draft.length,
                        qualityWarnings: qualityCheck.warnings 
                    },
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
