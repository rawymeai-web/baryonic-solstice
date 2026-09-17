
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { getWordCountForAge } from '../rules/guidebook';
import { StoryBlueprint, WorkflowLog, Language } from '../../types';

// =========================================================================
// 1. SPREAD-BY-SPREAD FUNCTION MAPS
// =========================================================================

// Toddler 3-Beat Board Book Arc (Ages 1-3)
export const TODDLER_SINGLE_HERO_FUNCTION_MAP = `
Spread 1 — Home Base & Hero: Name the hero and their cozy home base (room, rug, yard).
Spread 2 — Anchor & Desire: Introduce the anchor object and its simple physical rule (e.g. clicks/opens when turned gently or held level).
Spread 3 — Playful Catalyst: A friendly creature or sound appears from the home base (e.g. "Tap tap!").
Spread 4 — Small Trouble: The hero acts too fast or the creature hides. The anchor object stays stuck or resets.
Spread 5 — Stillness & Low Point: The hero sits down and rests. Name the primary feeling plainly ("felt sad", "sat still").
Spread 6 — Calm Insight: The hero stays quiet, calm, and adjusts their physical action (turns slowly, holds level).
Spread 7 — Happy Success: The creature returns and snuggles close / anchor clicks open into place. The hero feels proud and happy!
Spread 8 — Cozy Bedtime Close: The hero carries their friend/object back to the cozy home base. Warm, sweet bedtime close.
`.trim();

export const TODDLER_DUAL_HERO_FUNCTION_MAP = `
Spread 1 — Home Base & Both Heroes: Name both heroes and their shared cozy home base (room, yard).
Spread 2 — Anchor & Desire: Introduce their shared anchor object and its simple physical rule (e.g. balances when held together).
Spread 3 — Playful Catalyst: A friendly creature or sound appears.
Spread 4 — Small Trouble: One hero pulls fast, one slow. The basket tips / anchor stays closed due to mismatch.
Spread 5 — Stillness & Low Point: Both heroes sit down together. Name their feelings simply ("felt sad", "felt shy").
Spread 6 — Calm Insight: Both heroes sit quiet, hold hands, and adjust together (move in steady sync).
Spread 7 — Happy Success: Together, they lift / reach with steady sync and succeed. Both feel proud and joyful!
Spread 8 — Cozy Bedtime Close: Both return to their cozy home base for a sweet, happy rest together.
`.trim();

// Standard 5-Beat Arc (Ages 4+)
export const SINGLE_HERO_FUNCTION_MAP = `
Spread 1 — Ground & Introduce: name the hero, their home base, and why
  THIS goal matters to them specifically. State the anchor object's one
  physical cause-first rule (how turning, pressing, or balancing it operates it).
Spread 2 — Catalyst: the problem or companion appears, sensed from the
  home base (a sound, a sight) — not dropped in with no lead-in.
Spread 3 — First Attempt: the hero tries their natural approach, and it
  fails BECAUSE of their trait or hasty physical action. Say the "because" —
  don't leave it for the reader to infer.
Spread 4 — Complication: the failure deepens; a calm, passive
  mentor-figure appears (an animal or friendly fictional guide) demonstrating
  the right behavior.
Spread 5 — Low Point: the hero's lowest emotional beat, named directly
  ("felt sad," not just a physical description); the anchor object remains
  unresponsive or jammed due to the wrong approach.
Spread 6 — Insight: the hero notices something through stillness or
  observation, realizes the true physical mechanism or adjustment needed.
Spread 7 — Climax: the hero acts on the insight with the correct physical
  operation and succeeds through their OWN changed behavior — not luck, not
  the mentor doing it for them.
Spread 8 — Return & Close: an explicit bridge back to Spread 1's home
  base, in the same words used there, ending on a warm, concrete,
  non-preachy line.
`.trim();

export const DUAL_HERO_FUNCTION_MAP = `
Spread 1 — Ground & Introduce Both: name both heroes, their relationship,
  their shared home base, and why this goal matters to them. State the
  anchor object's physical cause-first rule.
Spread 2 — Catalyst: the problem or companion appears, sensed from the
  home base. If one hero arrives rather than starting the scene, give
  them a warm on-screen entrance here.
Spread 3 — First Attempt: the failure comes from a MISMATCH between the
  two heroes' physical approaches (one rushes, one hesitates) — say the
  "because," and make clear it's the friction between them, not one
  hero's fault alone.
Spread 4 — Complication: the failure deepens for both; a calm
  mentor-figure appears demonstrating quiet balance.
Spread 5 — Low Point: EACH hero gets their own named feeling — they
  should not feel identical or interchangeable. The shared anchor remains
  unresponsive.
Spread 6 — Insight: the realization can belong to one hero or emerge
  from both; both heroes visibly coordinate and discover the right synchronized action.
Spread 7 — Climax: BOTH heroes act in synergy, each contributing something distinct
  only they could bring to operate the anchor and solve the challenge.
Spread 8 — Return & Close: both return together; the close reflects
  what changed between them, not just one hero's arc.
`.trim();

// =========================================================================
// 2. GOLD STANDARD EXEMPLARS (EN & AR)
// =========================================================================

const SINGLE_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR A (Bedtime Theme, Hero: "Zara", Anchor: Star Jar):
Spread 1: Zara plays in her cozy room.
Spread 2: Zara holds her glowing star jar.
Spread 3: Tap tap! A little lamb peeks in.
Spread 4: The shy lamb hides away.
Spread 5: Zara sits down. Zara feels sad.
Spread 6: Zara sits still. The jar glows.
Spread 7: The lamb hops out and snuggles close.
Spread 8: Zara hugs the lamb. Sweet dreams!`,

    `EXEMPLAR B (Helping Theme, Hero: "Adam", Anchor: Water Pail):
Spread 1: Adam plays in his sunny yard.
Spread 2: Adam holds his glowing water pail.
Spread 3: Drip drop! A thirsty flower droops down.
Spread 4: The water spills on the grass.
Spread 5: Adam sits down. Adam feels sad.
Spread 6: Adam sits still. The pail glows.
Spread 7: Adam pours softly. The flower blooms!
Spread 8: Adam smiles in the warm sun.`
  ],
  "4-5": [
    `EXEMPLAR A (Adventure Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop, Leo polished his brass compass. It spun true when Leo stayed patient.
Spread 2: A sudden breeze swept inside, carrying a bright golden feather. TWEET! A bluebird called outside.
Spread 3: Leo dashed outside chasing the bird. His compass spun wild and useless. Leo felt upset.
Spread 4: The forest path split into three dark turns. A calm mountain turtle crawled slowly past.
Spread 5: Leo sat down on a mossy stone. The compass lay dark. Leo felt sad. SIGH...
Spread 6: Leo sat very still and listened. His compass needle clicked north with warm gold light.
Spread 7: Leo walked with steady steps. The compass glowed bright as he found the bird's nest.
Spread 8: Leo returned to his cozy workshop, placing the feather down. Quiet patience was true magic.`,

    `EXEMPLAR B (Nature Theme, Hero: "Maya", Anchor: Copper Lantern):
Spread 1: Maya sat on her garden porch with her copper lantern. It glowed warm when Maya listened.
Spread 2: FLAP FLAP! A baby barn owl hopped into the jasmine bushes, looking lost and confused.
Spread 3: Maya reached out too fast to catch it. The startled owl fluttered high into branches.
Spread 4: The owl stayed hidden in the leaves. A sleepy hedgehog rustled calmly through the grass.
Spread 5: Maya sat by the flowerbed. Her lantern flickered and grew cool. Maya felt disappointed. SIGH...
Spread 6: Maya sat quietly and listened to the gentle wind. Her lantern began glowing warm again.
Spread 7: Maya held her lantern low and hummed softly. The baby owl hopped into her hands!
Spread 8: Maya carried the sleepy owl back to her porch. Gentle listening was the best magic.`
  ],
  "6-8": [
    `EXEMPLAR A (Discovery Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop nook, Leo polished his brass compass. It spun true whenever Leo stayed patient. Leo dreamed of mapping the Whispering Forest.
Spread 2: A sudden gust swept open the window, carrying a bright golden feather. TWEET! A curious bluebird called from the garden gate to Leo.
Spread 3: Leo dashed through the brambles chasing the bird. His compass spun wild and useless in his shaking hands. Leo felt angry and frustrated.
Spread 4: The path split three ways into dark shadows. Leo stopped, breathless and confused. An old mountain tortoise lumbered past, following the gentle slope of moss.
Spread 5: Leo slumped onto a mossy boulder. The compass needle lay still and dull. Leo felt disappointed and alone in the quiet woods. SIGH...
Spread 6: Leo closed his eyes and listened to the breeze. He noticed the moss faced the morning sun. His compass needle clicked firmly northward. Leo smiled.
Spread 7: Leo walked with steady steps along the sunlit moss path. CLICK! The compass glowed gold as he reached the singing bird's hollow. Leo cheered proudly!
Spread 8: Leo returned home to his cozy workshop nook, placing the golden feather on his finished map. Leo felt joyful. True exploration began with patience.`,

    `EXEMPLAR B (Nature Theme, Hero: "Maya", Anchor: Copper Lantern):
Spread 1: Maya sat on her breezy garden porch, holding her copper lantern. The lantern shone warm whenever Maya listened carefully. Maya loved caring for night flowers.
Spread 2: A sudden flutter rustled the jasmine bushes. FLAP FLAP! A baby barn owl hopped out, blinking its large eyes in great surprise and confusion.
Spread 3: Maya reached out quickly to grab the owl. The startled owl fluttered up into a tall olive branch. Maya felt very upset and sad.
Spread 4: The little owl stayed high in the dark leaves. Maya stood breathless and confused. A sleepy garden hedgehog rustled softly through the dry green grass.
Spread 5: Maya sat down beside the flowerbed. Her copper lantern flickered and grew cool. Maya felt disappointed and alone in the dark garden. SIGH...
Spread 6: Maya sat very quietly and listened to the breeze. She heard the soft rustling of the leaves. Her lantern glowed warm. Maya felt peaceful.
Spread 7: Maya held her lantern low and hummed a sweet tune. HUMMM... The baby owl hopped down into Maya's gentle hands. Maya cheered with great pride!
Spread 8: Maya carried the sleepy owl back to her breezy garden porch. Her lantern glowed bright. Maya felt joyful. Soft listening was the best magic.`
  ],
  "9-12": [
    `EXEMPLAR (Discovery Theme, Hero: "Tariq", Anchor: Silver Astrolabe):
Spread 1: High in his attic observatory, Tariq polished his silver astrolabe beside the open skylight. The instrument hummed with silver light whenever Tariq was thoughtful and still. Tariq dreamed of discovering the forgotten Star of the Sea before the festival bells rang.
Spread 2: A sudden flash of emerald light streaked across the evening sky, leaving a trail of glowing stardust over the ancient harbor ruins. WHOOSH! A sea gull squawked from the stone railing, dipping its wings toward the bay to guide him onward.
Spread 3: Tariq bolted down the spiraling observatory stairs, running too fast across the slippery cobblestones. He tripped, dropping his charts into the wet tide pool. His astrolabe spun erratically and dimmed into darkness. Tariq felt angry and frustrated with himself for rushing so carelessly.
Spread 4: The stardust trail began to fade into the dense coastal fog. Tariq stood stranded among the jagged tide rocks, unsure which inlet to follow. A gray harbor seal surfaced quietly in the calm water, tilting its whiskered head with unhurried patience.
Spread 5: Tariq slumped against a damp sea wall. The silver astrolabe in his hands turned completely cold and dark. Tariq felt utterly defeated and ready to pack up his satchel and go home in deep disappointment. SIGH... The cold wind blew softly.
Spread 6: Tariq took a slow, deep breath and watched the seal glide smoothly with the incoming tide. He realized that the stardust did not drift with the wind, but reflected along the natural current of the waves. His astrolabe chimed and pulsed warm silver. Tariq felt confident and focused.
Spread 7: Tariq stepped carefully along the tidal rocks, matching the steady rhythm of the water. CHIME! His astrolabe blazed with bright emerald light as he uncovered the glowing Star of the Sea resting safely inside a giant sea shell. Tariq cheered with immense pride!
Spread 8: Tariq walked briskly back up to his attic observatory, placing the radiant sea star beside his celestial map just as the town bells echoed warmly. Tariq felt profoundly happy and fulfilled. Patient observation had unlocked what hurried rushing could never find.`
  ]
};

const DUAL_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR (Teamwork Theme, Heroes: "Nour" and "Sami", Anchor: Shared Basket):
Spread 1: Nour and Sami play in their yard.
Spread 2: Their little basket glows warm gold.
Spread 3: Creak creak! A tiny turtle looks stuck.
Spread 4: The basket tips. Treats roll away.
Spread 5: Nour and Sami sit down sad.
Spread 6: They hold hands. The basket glows.
Spread 7: Together, they lift the basket high.
Spread 8: Nour and Sami cheer. Goodnight, friends!`
  ],
  "4-5": [
    `EXEMPLAR (Cooperation Theme, Heroes: "Tariq" and "Laila", Anchor: Sun Compass):
Spread 1: Tariq and Laila played in their garden. Their sun compass glowed when they shared kindly.
Spread 2: CHIRP! A tiny desert swallow fluttered near the garden wall, looking weary and very thirsty.
Spread 3: Tariq rushed with crumbs while Laila shouted. The frightened bird flew to a high ledge.
Spread 4: The bird stayed out of reach. A quiet garden turtle crawled slowly to the fountain.
Spread 5: Tariq sat by the wall and Laila sat on the bench. Their compass dimmed.
Spread 6: Tariq and Laila shared their water cup. Their sun compass sparked with warm gold light.
Spread 7: Tariq held the dish steady while Laila called softly. The swallow drank happily from them.
Spread 8: Tariq and Laila carried their bright compass home. Working gently together was the best magic.`
  ],
  "6-8": [
    `EXEMPLAR (Adventure Partnership, Heroes: "Rayan" and "Maya", Anchor: Crystal Prism):
Spread 1: In their cozy treehouse workshop, Rayan and Maya unfurled an ancient star chart beside their crystal prism. The prism glowed whenever both worked with calm trust.
Spread 2: A brilliant blue spark danced across the night sky. WHOOSH! A mountain hare dashed past the ladder, kicking up a bright shower of glowing pebbles.
Spread 3: Rayan hurried ahead with the lantern, while Maya lingered behind. In their haste, the star chart slipped into a thorny thicket. Both felt frustrated and upset.
Spread 4: The thorny thicket was dark, and the canyon path was obscured. A wise mountain owl landed softly on a nearby branch, watching with calm, patient eyes.
Spread 5: Rayan sat on a boulder in defeat. Maya knelt by the trail, fighting back tears of disappointment. Their crystal prism lay dark on the moss.
Spread 6: Rayan and Maya observed how the owl stayed still. Rayan slowed down, and Maya offered her hand. The crystal prism flared with warm violet light.
Spread 7: Maya held the prism high while Rayan reached through the brambles to retrieve the chart. Together, they reached the lookout summit. Both cheered with immense pride!
Spread 8: Rayan and Maya returned safely to their cozy treehouse workshop, framing their star chart beside the glowing prism. Rayan and Maya felt happy and united.`
  ],
  "9-12": [
    `EXEMPLAR (Scholarly Teamwork, Heroes: "Karim" and "Hana", Anchor: Bronze Chronometer):
Spread 1: In the sun-drenched library of the coastal academy, Karim and Hana examined their bronze chronometer. The chronometer ticked in harmony only when both scholars shared discoveries without rivalry. They were determined to decode the ancient navigational parchment before the expedition fleet departed at dawn.
Spread 2: A sudden sea breeze swept through the arched gallery, rustling parchment scrolls. A shimmering golden dragonfly darted into the courtyard, tracing glowing spirals above the sundial fountain before disappearing into the labyrinthine archives. Both scholars watched with eager curiosity and wonder.
Spread 3: Karim insisted on using formulas, while Hana tried following its visual path. Their conflicting approaches caused Karim to miscalculate coordinates and Hana to lose the trail in the dark corridors. The chronometer stalled with a harsh rattle. Karim felt bitter frustration, and Hana felt dismissed.
Spread 4: Deep in the archive vaults, shadows grew long and confusing. Karim and Hana stood stranded at a dead end of towering shelves. A seasoned archivist cat trotted gracefully past, pausing at the threshold of a forgotten doorway and listening to the subtle wind.
Spread 5: Karim slumped against leather folios, running hands through his hair. Hana sat on the stone bench, staring at the frozen chronometer dials. Both felt defeated and sorrowful, fearing stubborn pride had cost them their expedition glory. SIGH...
Spread 6: Karim and Hana watched the cat navigate the acoustic echoes. Karim realized his formulas needed Hana's intuition, while Hana recognized her tracking needed Karim's precision. When they shared notes and apologized, the chronometer chimed and glowed with warm amber light.
Spread 7: Working in synergy, Hana mapped the resonant echoes while Karim calibrated celestial coordinates. CHIME! The bronze chronometer clicked open, revealing the hidden navigational cipher as the morning sun illuminated the library dome. Karim and Hana embraced with triumphant pride!
Spread 8: Karim and Hana walked back to the sun-drenched library of the coastal academy, presenting the decoded parchment to the expedition captains as harbor horns sounded. Karim and Hana felt profound fulfillment. Great breakthroughs were born from the harmonious fusion of complementary minds.`
  ]
};

const SINGLE_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة وقت النوم، البطلة: "زارا"، الأداة: برطمان النجوم):
الصفحة 1: تلعب زارا في غرفتها الدافئة.
الصفحة 2: يتوهج برطمان زارا بنور جميل.
الصفحة 3: طق طق! أطل حمل صغير.
الصفحة 4: خاف الحمل الصغير واختبأ سريعا.
الصفحة 5: جلست زارا حزينة على البساط.
الصفحة 6: جلست زارا بهدوء فتوهج البرطمان.
الصفحة 7: اقترب الحمل وعانق زارا بحب.
الصفحة 8: نام الحمل الصغير. تصبح على خير.`,

    `نموذج (قصة العطاء والمساعدة، البطل: "آدم"، الأداة: دلو الماء):
الصفحة 1: يلعب آدم في حديقته المشمسة.
الصفحة 2: يتوهج دلو آدم بنور دافئ.
الصفحة 3: قطرة قطرة! مالت زهرة عطشى.
الصفحة 4: انسكب الماء وبقيت الزهرة حزينة.
الصفحة 5: جلس آدم حزينا على العشب.
الصفحة 6: جلس آدم هادئا فتوهج الدلو.
الصفحة 7: سقى آدم الزهرة فتفتحت بفرح.
الصفحة 8: ابتسم آدم بسعادة في حديقته.`
  ],
  "4-5": [
    `نموذج (قصة الاستكشاف والصبر، البطل: "ليث"، الأداة: البوصلة النحاسية):
الصفحة 1: في ركن ورشته المشمس، جلس ليث يمسح بوصلته النحاسية. كانت تدور بثبات كلما تحلى بالصبر.
الصفحة 2: هبت نسمة هواء دافئة وحملت ريشة ذهبية براقة. غرد عصفور أزرق جميل عند بوابة الحديقة.
الصفحة 3: ركض ليث بسرعة يلاحق العصفور، فدارت البوصلة بعنف بين يديه. شعر ليث بالضيق والتعب.
الصفحة 4: تفرقت المسارات بين الظلال. مرت سلحفاة جبلية قديمة تمشي بهدوء وثبات فوق العشب الأخضر.
الصفحة 5: جلس ليث على صخرة مغطاة بالعشب. انطفأ نور البوصلة فشعر ليث بالحزن والوحدة. هفف...
الصفحة 6: جلس ليث ساكنا يستمع لحفيف الرياح. أشارت البوصلة إلى الشمال بنور هادئ فاطمأن قلبه.
الصفحة 7: مشى ليث بخطوات هادئة نحو النور. توهجت البوصلة بنور ذهبي حين وجد عش العصفور.
الصفحة 8: عاد ليث بريشته الذهبية إلى ورشته المشمسة. الصبر والهدوء كانا أجمل بداية لكل مغامرة.`
  ],
  "6-8": [
    `نموذج (قصة التأمل والاكتشاف، البطل: "ليث"، الأداة: البوصلة النحاسية):
الصفحة 1: في ركن ورشته المشمس، جلس ليث يمسح بوصلته النحاسية اللامعة. كانت تدور بثبات كلما تحلى ليث بالصبر. حلم ليث باستكشاف الغابة الهامسة ووديانها الجميلة.
الصفحة 2: فجأة، هبت نسمة هواء دافئة وحملت ريشة ذهبية براقة عبر النافذة. غرد عصفور أزرق جميل عند بوابة الحديقة داعيا ليث لمغامرة شيقة وممتعة.
الصفحة 3: ركض ليث بسرعة بين الشجيرات يلاحق العصفور الطائر. دارت البوصلة بعنف بين يديه المتعبتين وتوقف بريقها. شعر ليث بالضيق والإحباط الشديد من تسرعه.
الصفحة 4: تفرقت المسارات بين الظلال الكثيفة، وتوقف ليث حائرا ومتعبا. مرت سلحفاة جبلية قديمة تمشي بهدوء وثبات وصبر عجيب فوق بساط العشب الأخضر.
الصفحة 5: جلس ليث على صخرة مغطاة بالعشب الندي. توقفت إبرة البوصلة وبدت باردة ومظلمة تماما. شعر ليث بالحزن والوحدة في الغابة الهادئة. هفف...
الصفحة 6: جلس ليث ساكنا وأغمض عينيه يستمع لحفيف الرياح. لاحظ أن العشب ينمو باتجاه شمس الصباح. أشارت البوصلة إلى الشمال بنور هادئ. شعر ليث بالاطمئنان.
الصفحة 7: مشى ليث بخطوات هادئة وثابتة في طريق النور. توهجت البوصلة بنور ذهبي ساطع عندما وصل إلى عش العصفور المغرد. شعر ليث بالفخر والسرور!
الصفحة 8: عاد ليث بريشته الذهبية إلى ركن ورشته المشمس، ووضعها فوق خريطته. توهجت بوصلته بنور دافئ. شعر ليث بالسعادة، فالصبر مفتاح كل استكشاف جميل.`
  ],
  "9-12": [
    `نموذج (قصة التأمل والاكتشاف، البطل: "طارق"، الأداة: الأسطرلاب الفضي):
الصفحة 1: في مرصده الهادئ أعلى البرج، جلس طارق يمسح أسطرلابه الفضي بجانب النافذة الواسعة. كان الأسطرلاب يهمس بنور ناصع كلما تأمل طارق بسكينة وصبر. تمنى طارق اكتشاف نجم البحر المضيء قبل أن تدق أجراس المساء في المدينة وتعلن بدء الاحتفال السنوي الكبير.
الصفحة 2: فجأة، لمع بريق زمردي في السماء الصافية تاركا أثرا من الغبار المتلألئ فوق مياه الميناء القديم. طار طائر نورس أبيض ملوحا بجناحيه نحو الخليج الأزرق، كأنه يرشد طارق إلى المسار الصحيح نحو النور السري الخفي بين الأمواج.
الصفحة 3: اندفع طارق راكضا على درجات البرج الحجرية ونزل مسرعا نحو الشاطئ الرطب دون انتباه. تعثر طارق وسقطت خرائطه في الماء، وتوقف أسطرلابه الفضي عن اللمعان والنبض. شعر طارق بالغضب والإحباط والندم من تسرعه الذي أفسد كل خططه الدقيقة.
الصفحة 4: بدأ ضوء البريق يتلاشى بين ضباب الساحل الكثيف. وقف طارق بين الصخور المبللة لا يعرف أي ممر مائي يسلك. ظهرت فقمة رمادية لطيفة تسبح في الماء الهادئ برفق، مائلة برأسها الصغير في سكينة وصبر عجيب يلفت الأنظار في هذا الصمت.
الصفحة 5: جلس طارق على جدار صخري قديم يراقب مياه البحر الهائجة. انطفأ ضوء الأسطرلاب الفضي في يديه تماما وبدا باردا كالحجر. شعر طارق بالحزن الشديد والرغبة في الاستسلام والعودة خائبا إلى البيت مع حلول الظلام الدامس. هفف...
الصفحة 6: تنفس طارق بهدوء وراقب الفقمة تتبع حركة الأمواج اللطيفة دون تسرع. أدرك طارق أن الضوء يتجه مع حركة المد الطبيعية للماء وليس مع الرياح. أضاء الأسطرلاب الفضي بنور دافئ. شعر طارق بالأمل والثقة وعودة العزيمة من جديد.
الصفحة 7: مشى طارق بخطوات متزنة مع إيقاع الموج الهادئ على الشاطئ. توهج الأسطرلاب ببريق زمردي مشرق حين وجد نجم البحر المضيء يستقر بأمان داخل صدفة بيضاء جميلة. شعر طارق بفخر عظيم وسعادة غامرة بهذا الإنجاز الرائع والمستحق!
الصفحة 8: صعد طارق درجات مرصده الهادئ أعلى البرج، ووضع نجم البحر المضيء فوق خريطته الكبيرة مع دقات أجراس المساء الدافئة. شعر طارق بالسكينة والبهجة. كان التأمل الهادئ هو المفتاح الحقيقي لاكتشاف عجائب العالم التي لا ينالها المتعجلون أبدا.`
  ]
};

const DUAL_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة العمل الجماعي، الأبطال: "نور" و"سامي"، الأداة: السلة المشتركة):
الصفحة 1: لعبت نور وسامي في فنائهما.
الصفحة 2: توهجت سلتهما المشتركة بنور ذهبي.
الصفحة 3: طق طق! أطلت سلحفاة صغيرة.
الصفحة 4: مالت السلة وسقطت الثمار بعيدا.
الصفحة 5: جلست نور وجلس سامي بحزن.
الصفحة 6: أمسكا الأيدي فتوهجت السلة مجددا.
الصفحة 7: رفعا السلة معا بفرح وفخر.
الصفحة 8: فرح الأصدقاء وعادت السعادة للفناء.`
  ],
  "4-5": [
    `نموذج (قصة التعاون والمحبة، الأبطال: "طارق" و"ليلى"، الأداة: بوصلة الشمس):
الصفحة 1: في حديقة سطحهما المشمسة، لعب طارق وليلى. كانت بوصلة الشمس تلمع بالذهب كلما تعاونا بمحبة.
الصفحة 2: زقزق طائر سنونو صغير قرب السياج وبدا متعبا وعطشا. تمنى الصغيران مساعدته والاعتناء به.
الصفحة 3: اندفع طارق بفتات الخبز وصاحت ليلى بحماس، فخاف الطائر وطار إلى حافة عالية.
الصفحة 4: وقف الطائر بعيدا في الظل. مرت سلحفاة الحديقة الهادئة تزحف ببطء نحو حوض الماء.
الصفحة 5: جلس طارق عند الجدار وجلست ليلى حزينة على المقعد. انطفأ نور بوصلة الشمس بينهما.
الصفحة 6: تقاسم طارق وليلى وعاء الماء واعتذر كل منهما بلطف. أضاءت البوصلة بنور دافئ مجددا.
الصفحة 7: حمل طارق الوعاء بثبات ونادت ليلى الطائر بهدوء، فهبط السنونو وشرب بفرح من أيديهما.
الصفحة 8: عاد طارق وليلى ببوصلتهما المتوهجة إلى حديقة السطح. التعاون الصادق كان أجمل سر في الحديقة.`
  ],
  "6-8": [
    `نموذج (قصة التعاون والمحبة، الأبطال: "طارق" و"ليلى"، الأداة: بوصلة الشمس):
الصفحة 1: في حديقة سطحهما المشمسة، لعب طارق وليلى معا. كانت بوصلة الشمس تلمع بالذهب كلما تعاونا بمحبة وتفاهم. رغب طارق وليلى في مساعدة طائر السنونو الصغير.
الصفحة 2: فجأة، هبت نسمة رقيقة بين أوراق النخيل العالية. زقزق طائر سنونو صغير يقف عند سياج الحديقة متعبا وعطشا، متطلعا لقطرة ماء تنعش روحه.
الصفحة 3: اندفع طارق سريعا بفتات الخبز وصاحت ليلى بحماس كبير. خاف الطائر الصغير وطار بعيدا نحو حافة صخرية عالية. شعر طارق وليلى بالضيق ولوم أحدهما الآخر.
الصفحة 4: وقف الطائر بعيدا في الظل العالي. وقف الصغيران في حيرة وأسف. مرت سلحفاة الحديقة الهادئة تزحف ببطء ورفق شديد نحو حوض الماء الصغير.
الصفحة 5: جلس طارق عند الجدار شاعرا بالخيبة، وجلست ليلى على المقعد شاعرة بالحزن. انطفأ نور بوصلة الشمس وبدت باردة ومظلمة بين يديهما في صمت الحديقة.
الصفحة 6: راقب طارق وليلى هدوء السلحفاة وصبرها. مد طارق يده لليلى واعتذرت ليلى بلطف وقاسما وعاء الماء معا. أضاءت بوصلة الشمس بنور دافئ، فشعرا بالأمل.
الصفحة 7: حمل طارق وعاء الماء بثبات كبير بينما نادت ليلى الطائر بصوت رقيق وهادئ. هبط السنونو وشرب بارتياح من بين أيديهما. شعر طارق وليلى بالفخر والسرور!
الصفحة 8: حمل طارق وليلى بوصلة الشمس وعادا إلى حديقة سطحهما المشمسة بينما غرد السنونو فرحا في السماء. تلألأت البوصلة بنور ذهبي ساطع. شعرا بالسعادة الغامرة والمحبة.`
  ],
  "9-12": [
    `نموذج (قصة التكامل الفكري، الأبطال: "كريم" و"هناء"، الأداة: الميقاتية النحاسية):
الصفحة 1: في رحاب مكتبة الأكاديمية البحرية المطلة على الساحل المشمس، جلس كريم وهناء يدرسان الميقاتية النحاسية العتيقة المستقرة فوق مكتبهما المشترك. كانت الميقاتية تنبض بنور كهرماني متناغم فقط عندما يجمع الباحثان بين مهاراتهما الفكرية بروح الفريق ودون تنافس. كانا عازمين على فك الشفرة قبل الفجر.
الصفحة 2: هبت نسمة بحرية عليلة عبر الأقواس الحجرية للمكتبة وحركت لفائف المخطوطات القديمة. وفي تلك الأثناء، حلقت يعسوب ذهبية براقة في الفناء، راسمتا مسارات هندسية مضيئة فوق نافورة المزولة الشمسية قبل أن تتوارى نحو أروقة الأرشيف الحجري العتيق في غموض وإثارة.
الصفحة 3: أصر كريم على استخدام المعادلات الحسابية لتوقع مسار اليعسوب، بينما اندفعت هناء لتتبع أثرها البصري سيرا على الأقدام. أدى هذا الاختلاف إلى خطأ كريم في الحساب وفقدان هناء للأثر في الممرات، فتوقفت الميقاتية بصوت رنين حاد. شعر كريم بالإحباط، وشعرت هناء بالغضب والخذلان.
الصفحة 4: امتدت الظلال الطويلة بين رفوف الكتب الجلدية الضخمة في أقبية الأرشيف، ووجد كريم وهناء نفسيهما عند ممر مسدود تماما. مر قط الأرشيف الماهر بخطوات واثقة وهادئة، متوقفا عند عتبة باب حجري مهجور ومصغيا بانتباه شديد لأصداء الرياح المترددة عبر الشقوق في جدران القبو.
الصفحة 5: جلس كريم على درج حجري وأسند جبينه إلى كفيه في حزن شديد، بينما جلست هناء تراقب الميقاتية النحاسية الساكنة. شعر كلاهما بالهزيمة، وظنا أن كبرياءهما وتشبث كل منهما برأيه قد أضاع فرصة المشاركة في رحلة الاستكشاف الكبرى التي كانا يحلمان بها طويلا.
الصفحة 6: راقب كريم وهناء حركة القط وتركيزه على أصداء المكان. أدرك كريم أن معادلاته تفتقر إلى حدس هناء البصري، وأدركت هناء أن ملاحظاتها تحتاج إلى دقة كريم الرياضية. وحين جمعا دفاترهما وتسامحا بلطف وصدق، عادت الميقاتية تدق بنغمات موسيقية ساحرة وتتوهج بنور كهرماني مشرق.
الصفحة 7: بتعاون مخلص وتناغم تام، حددت هناء اتجاه الأصداء الصوتية بينما ضبط كريم إحداثيات البوصلة الفلكية. انفتحت الميقاتية النحاسية معلنة فك الشفرة الملاحية في اللحظة التي أشرقت فيها خيوط الشمس الأولى على قبة المكتبة. تعانق كريم وهناء بفخر واعتزاز غامرين بهذا الإنجاز المشترك!
الصفحة 8: سار كريم وهناء بثقة عائدين إلى رحاب مكتبة الأكاديمية البحرية المطلة على الساحل، وسلما المخطوطة المفكوكة لقادة الأسطول مع انطلاق أبواق السفن في الميناء. شعر كريم وهناء ببهجة عميقة وامتنان متبادل. فالإنجازات العظيمة لا تصنعها العقول الفردية وحدها، بل تولد من التناغم الصادق بين العقول المتعاونة.`
  ]
};

function getExemplars(isDual: boolean, age: number, language: Language): string {
  const isAr = language === 'ar';
  const ageBand = age <= 3 ? "1-3" : (age <= 5 ? "4-5" : (age <= 8 ? "6-8" : "9-12"));
  
  const poolMap = isDual 
    ? (isAr ? DUAL_HERO_EXEMPLARS_AR : DUAL_HERO_EXEMPLARS_EN)
    : (isAr ? SINGLE_HERO_EXEMPLARS_AR : SINGLE_HERO_EXEMPLARS_EN);

  // Step-down graceful fallback order: requested ageBand -> next younger age bands
  const fallbackOrder = [ageBand, "6-8", "4-5", "1-3"];
  let pool: string[] | undefined;
  for (const band of fallbackOrder) {
    if (poolMap[band] && poolMap[band].length > 0) {
      pool = poolMap[band];
      break;
    }
  }
  if (!pool || pool.length === 0) {
    pool = isDual ? DUAL_HERO_EXEMPLARS_EN["1-3"] : SINGLE_HERO_EXEMPLARS_EN["1-3"];
  }
  return pool.join("\n\n---\n\n");
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

{{HERO_DESIRE_SECTION}}

{{ANCHOR_TRIGGER_SECTION}}

{{CUSTOM_STORY_SECTION}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLARS (age {{CHILD_AGE}} voice)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{EXEMPLARS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NON-NEGOTIABLES (short on purpose — everything else is voice, not rule)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. The hero's world is entirely child-driven and imaginative: talking
   animals, gentle magical guides, and friendly fictional mentors (like
   an eccentric astronomer, an ancient clockmaker, or a forest sprite)
   are who they turn to and learn from. Keep the focus on the hero's
   discovery and agency rather than domestic parental supervision or
   realistic family roles.
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
8. Arabic Output Rules (CRITICAL FOR AGE-APPROPRIATE STORYTELLING):
   - Use clean, modern, child-accessible Fusha (فصحى بسيطة وسلسة وشيقة للأطفال).
   - FORBIDDEN COMPLEXITY: Strictly avoid heavy classical rhetoric, archaic vocabulary, and abstract adult metaphors (e.g. do NOT use adult expressions like "يثقل كاهلها بالتردد", "فجوة عميقة لا نهاية لها", "حسرة دفينة", "صراع مرير"). Keep thoughts, actions, and dialogues simple, sensory, playful, and directly relatable to a young child.
   - GENDER CONSISTENCY (CRITICAL): Ensure 100% strict gender agreement across all verbs, adjectives, and pronouns matching the hero's gender ({{CHILD_GENDER_ARABIC}}). Never switch between masculine and feminine verbs in the same story.
   - Plain text only, no Tashkeel/Harakat.
{{AGE_SPECIFIC_RULES}}

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

            const functionMap = age <= 3
                ? (isDual ? TODDLER_DUAL_HERO_FUNCTION_MAP : TODDLER_SINGLE_HERO_FUNCTION_MAP)
                : (isDual ? DUAL_HERO_FUNCTION_MAP : SINGLE_HERO_FUNCTION_MAP);

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

            const primaryAnchor = blueprint.foundation?.primaryVisualAnchor || 'Special Object';
            const heroDesire = blueprint.foundation?.heroDesire || '';
            const fallbackTrigger = `When ${isDual ? `${heroNameA} and ${heroNameB} operate` : `${childName} operates`} the ${primaryAnchor} with calm, steady patience, it works smoothly. When rushed, pulled hard, or tilted, it stops or resets.`;
            const activeAnchorRule = blueprint.foundation?.anchorTriggerRule || fallbackTrigger;

            const anchorRuleSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANCHOR OBJECT PHYSICAL TRIGGER RULE (CRITICAL MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Anchor Object: "${primaryAnchor}"
Trigger Mechanics: "${activeAnchorRule}"
Spread 1 must state this physical trigger clearly. Spread 3/4 show the failure when operated incorrectly, Spread 5 shows the hero's low point when it remains stuck, Spread 6 shows the insight into how to operate it properly, and Spread 7 shows the correct physical operation unlocking success.
`.trim();

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
MANDATORY: Distribute this text faithfully across the ${spreadCount} spreads.
`.trim() : '';

            const ageSpecificRules = age <= 3
                ? `9. TODDLER BOARD BOOK RULES (CRITICAL FOR AGES 1–3):
   - Strictly ${wordCountRule.min}–${wordCountRule.max} words per spread. Every spread must deliver ONE single, uncluttered visual and emotional idea.
   - 3-BEAT STORY SHAPE: Want (Spreads 1-3) -> Try & Simple Trouble/Recovery (Spreads 4-6) -> Got it & Cozy Rest (Spreads 7-8).
   - FORBIDDEN SUBORDINATE CLAUSES: Strictly NO complex or compound sentences with "because", "so that", "in order to", or chained clauses. Keep sentences short, direct, and musical (e.g. "${childName} sits still. The star jar glows.").
   - REPETITION & SOUNDS: Use playful, repetitive rhythm and familiar sound effects (Tap tap!, Shhh..., Drip drop!).`
                : `9. AGE ${age} PACING: Maintain clear cause-and-effect flow, rich sensory grounding, and natural conversational rhythm within ${wordCountRule.min}–${wordCountRule.max} words per spread.`;

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
                language,
                anchorTriggerRule: activeAnchorRule,
                primaryVisualAnchor: primaryAnchor
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

