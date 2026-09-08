
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
  mentor-figure appears (an animal or friendly fictional guide).
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
Spread 8: Adam carried Adam's pail to Adam's sunny yard. The flower grew tall and bright. Adam's pail glowed. Adam felt happy. Slow and gentle was the best kind of magic.`
  ],
  "4-5": [
    `EXEMPLAR A (Adventure Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop nook, Leo polished his brass compass. It spun true whenever Leo stayed patient. Leo dreamed of mapping the Whispering Forest.
Spread 2: A sudden gust swept open the window, carrying a bright golden feather. TWEET! A curious bluebird called from the garden gate.
Spread 3: Leo dashed through the brambles chasing the bird. His compass spun wild and useless in his shaking hands. Leo felt frustrated.
Spread 4: The path split three ways into dark shadows. Leo stopped, breathless and confused. An old mountain tortoise lumbered past, following the gentle slope of moss.
Spread 5: Leo slumped onto a mossy boulder. The compass needle lay still and dull. Leo felt disappointed and alone in the quiet woods. SIGH...
Spread 6: Leo closed his eyes and listened to the rustling breeze. He noticed the moss always faced the morning sun. His compass needle clicked firmly northward. Leo smiled with relief.
Spread 7: Leo walked with steady, confident steps along the sunlit moss path. CLICK! The compass glowed bright gold as he reached the singing bird's sunny hollow. Leo cheered with pride!
Spread 8: Leo returned home to his cozy workshop nook, placing the golden feather on his finished map. Leo felt joyful. True exploration began with quiet observation.`,

    `EXEMPLAR B (Nature Theme, Hero: "Maya", Anchor: Copper Lantern):
Spread 1: Maya sat on her breezy garden porch, holding her copper lantern. The lantern shone warm whenever Maya listened carefully. Maya loved caring for night flowers.
Spread 2: A sudden flutter rustled the jasmine bushes. FLAP FLAP! A baby barn owl hopped out, blinking in confusion.
Spread 3: Maya reached out quickly to grab the owl. The startled owl fluttered up into a tall olive branch. Maya felt upset.
Spread 4: The little owl stayed high in the dark leaves. Maya felt mixed up. A sleepy garden hedgehog rustled softly through the dry grass.
Spread 5: Maya sat down beside the flowerbed. Her copper lantern flickered and grew cool. Maya felt disappointed. SIGH...
Spread 6: Maya sat very quietly and listened to the gentle night breeze. She heard the soft rustling of the olive leaves. Her lantern glowed warm. Maya felt calm.
Spread 7: Maya held her lantern low and hummed a sweet, gentle tune. HUMMM... The baby owl hopped down into Maya's gentle hands. Maya felt proud!
Spread 8: Maya carried the sleepy owl back to her breezy garden porch. Her lantern glowed bright. Maya felt peaceful. Soft listening was the best kind of magic.`
  ],
  "6-8": [
    `EXEMPLAR (Discovery Theme, Hero: "Tariq", Anchor: Silver Astrolabe):
Spread 1: High in his attic observatory, Tariq polished his silver astrolabe beside the open skylight. The instrument hummed with silver light whenever Tariq was thoughtful and still. Tariq dreamed of discovering the forgotten Star of the Sea before the festival bells rang.
Spread 2: A sudden flash of emerald light streaked across the evening sky, leaving a trail of glowing stardust over the ancient harbor ruins. WHOOSH! A sea gull squawked from the stone railing, dipping its wings toward the bay.
Spread 3: Tariq bolted down the spiraling observatory stairs, running too fast across the slippery cobblestones. He tripped, dropping his charts into the wet tide pool. His astrolabe spun erratically and dimmed. Tariq felt angry and frustrated with himself.
Spread 4: The stardust trail began to fade into the dense coastal fog. Tariq stood stranded among the jagged tide rocks, unsure which inlet to follow. A gray harbor seal surfaced quietly in the calm water, tilting its whiskered head with unhurried patience.
Spread 5: Tariq slumped against a damp sea wall. The silver astrolabe in his hands turned completely cold and dark. Tariq felt utterly defeated and ready to pack up his satchel and go home. SIGH...
Spread 6: Tariq took a slow, deep breath and watched the seal glide smoothly with the incoming tide. He realized that the stardust did not drift with the wind, but reflected along the natural current of the waves. His astrolabe chimed and pulsed warm silver. Tariq felt confident and focused.
Spread 7: Tariq stepped carefully along the tidal rocks, matching the steady rhythm of the water. CHIME! His astrolabe blazed with bright emerald light as he uncovered the glowing Star of the Sea resting safely inside a giant sea shell. Tariq cheered with immense pride!
Spread 8: Tariq walked briskly back up to his attic observatory, placing the radiant sea star beside his celestial map just as the town bells echoed warmly. Tariq felt profoundly happy and fulfilled. Patient observation had unlocked what hurried rushing could never find.`
  ],
  "9-12": [
    `EXEMPLAR (Craft & Invention Theme, Hero: "Soraya", Anchor: Celestial Pocket Watch):
Spread 1: In the quiet warmth of her family's clockwork workshop, Soraya adjusted the delicate brass balance wheel of her celestial pocket watch. The heirloom watch ticked with a soothing, golden rhythm only when Soraya maintained inner focus and composure. Soraya was determined to calibrate the legendary Clockwork Heron before the Grand Solstice Exhibition, proving her mastery as an apprentice mechanist.
Spread 2: An unexpected tremor rattled the wooden workbenches, sending copper gears clattering to the floor. Through the high stained-glass transom, a clockwork silver moth darted past the courtyard fountain, its miniature wings clicking erratically like a winding spring unraveling out of control. CLICK-CLACK!
Spread 3: Driven by sudden panic, Soraya grabbed her heaviest wrench and lunged recklessly to capture the mechanical moth. Her hurried motion knocked over a stack of delicate sapphire prisms, shattering them against the flagstones. The moth vanished into the chimney flue, and Soraya's pocket watch froze completely mid-tick. Soraya felt intense frustration and regret burning in her chest.
Spread 4: Thick soot drifted from the fireplace, obscuring the workshop blueprints. Soraya stood paralyzed by doubt, fearing she had ruined weeks of meticulous preparation. An old workshop cat stretched languidly atop the oak rafters, moving with deliberate grace and watching the chimney with steady, unwavering patience.
Spread 5: Soraya sank onto the workshop stool, burying her face in her soot-stained aprons. The pocket watch remained cold and motionless against her palm. Soraya felt overwhelmingly discouraged, ready to admit failure and abandon her showcase at the Solstice Exhibition altogether.
Spread 6: Soraya closed her eyes and matched her breathing to the cat's steady purr. She realized that precision mechanisms respond to harmonic resonance rather than forceful intervention; the moth was attracted to the vibration of ticking gears, not physical capture. Her pocket watch began ticking again with a radiant golden glow. Soraya felt renewed clarity and determination.
Spread 7: Soraya set a gentle harmonic tuning fork on the iron hearth and gently wound her pocket watch. CHIME! As the resonant chord vibrated through the chimney, the silver moth fluttered down softly and settled peacefully atop the Heron's polished wing. The entire mechanism whirred into glorious, synchronized life. Soraya beamed with well-earned pride!
Spread 8: Soraya stood proudly in the quiet warmth of her family's clockwork workshop as the Heron's wings reflected the morning sun. Her pocket watch ticked steadily in her pocket, its golden hue warmer than ever. Soraya smiled with deep peace and accomplishment. True mastery lay not in forceful haste, but in the patient harmony of listening and understanding.`
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
  ],
  "4-5": [
    `EXEMPLAR (Cooperation Theme, Heroes: "Tariq" and "Laila", Anchor: Sun Compass):
Spread 1: Tariq and Laila played in their sunny rooftop garden. Their brass sun compass glowed bright gold whenever they shared and worked in harmony. They wanted to find the lost desert swallow.
Spread 2: A sudden breeze rustled the palm fronds. CHIRP! A tiny desert swallow fluttered near the garden trellis, looking weary and thirsty.
Spread 3: Tariq rushed forward with bread crumbs, while Laila shouted excitedly. The startled bird flew up to a high stone ledge. Tariq and Laila felt frustrated and blamed each other.
Spread 4: The bird perched out of reach. Tariq and Laila stood in tense silence. An old garden turtle crawled past, slow and gentle toward the water fountain.
Spread 5: Tariq sat by the wall, feeling disappointed. Laila sat on the bench, feeling sad. Their sun compass turned cold and dim between them.
Spread 6: Tariq and Laila watched the calm turtle drink peacefully. Laila offered a hand to Tariq, and Tariq shared his water cup. Their compass sparked with warm light. They felt hopeful.
Spread 7: Tariq held the water dish very steady while Laila softly called the swallow. CHIRP! The bird fluttered down and drank gently from their hands. Tariq and Laila beamed with pride!
Spread 8: Tariq and Laila carried their sun compass back to their sunny rooftop garden as the bird sang happily. Their compass shone brilliant gold. They felt joyful. Working together with gentle patience was true magic.`
  ],
  "6-8": [
    `EXEMPLAR (Adventure Partnership, Heroes: "Rayan" and "Maya", Anchor: Crystal Prism):
Spread 1: In their cozy treehouse workshop, Rayan and Maya unfurled an ancient celestial star chart beside their glowing crystal prism. The prism illuminated hidden pathways whenever the two worked with mutual trust and calm focus. They wanted to track the Midnight Comet from the mountain lookout.
Spread 2: A brilliant blue spark danced across the night sky, illuminating the canyon ridge. WHOOSH! A mountain hare dashed past the treehouse ladder, kicking up a shower of glowing pebbles.
Spread 3: Rayan hurried ahead with the lantern, while Maya lingered behind trying to adjust the telescope mount. In their haste, they pulled the map in opposite directions until it slipped into a thorny thicket. The crystal prism dimmed to gray. Rayan felt annoyed, and Maya felt resentful.
Spread 4: The thorny thicket was dense and dark, and the canyon path was obscured. Rayan and Maya stood apart in stubborn silence. A wise mountain owl landed softly on a nearby branch, watching them with calm, unblinking eyes.
Spread 5: Rayan sat on a flat boulder, crossing his arms in defeat. Maya knelt by the trail, fighting back tears of disappointment. Their crystal prism lay dark and cold on the moss. SIGH...
Spread 6: Rayan and Maya observed how the owl remained still, letting its eyes adjust to the darkness. Rayan admitted he rushed too fast, and Maya apologized for not speaking up. As they joined hands, the crystal prism flared with a brilliant violet glow. They felt energized and united.
Spread 7: Maya held the glowing prism high to light the dense brambles while Rayan carefully navigated the branches to retrieve their chart. Together, they reached the lookout summit just as the Midnight Comet blazed overhead. Rayan and Maya cheered with immense pride!
Spread 8: Rayan and Maya returned safely to their cozy treehouse workshop, framing their star chart beside the radiant crystal prism. Rayan and Maya felt deeply happy and bonded. True discovery was a journey shared with patience, trust, and teamwork.`
  ],
  "9-12": [
    `EXEMPLAR (Scholarly Teamwork, Heroes: "Karim" and "Hana", Anchor: Bronze Chronometer):
Spread 1: In the sun-drenched library of the coastal academy, Karim and Hana examined the mechanical bronze chronometer resting on their study desk. The chronometer ticked in radiant harmony only when both scholars synchronized their analytical thinking and shared their discoveries without rivalry. They were determined to decode the ancient navigational parchment before the expedition fleet departed at dawn.
Spread 2: A sudden sea breeze swept through the arched gallery, rustling the parchment scrolls. A shimmering golden dragonfly darted into the courtyard, tracing glowing geometric spirals above the sundial fountain before disappearing toward the labyrinthine archives.
Spread 3: Karim insisted on using mathematical formulas to predict the dragonfly's flight path, while Hana attempted to follow its visual trajectory on foot. Their conflicting approaches caused Karim to miscalculate the coordinate grid and Hana to lose sight of the trail in the archive corridors. The chronometer stalled with a dissonant metallic rattle. Karim felt bitter frustration, and Hana felt dismissed and angry.
Spread 4: Deep in the archive vaults, the shadows grew long and confusing. Karim and Hana found themselves stranded at a dead end of towering bookshelves. A seasoned archivist cat trotted gracefully past, pausing at the threshold of a forgotten doorway and listening intently to the subtle echo of the wind.
Spread 5: Karim slumped against a stack of leather folios, running his hands through his hair in despair. Hana sat on the stone bench, staring at the frozen dials of the bronze chronometer. Both felt defeated, convinced that their stubborn pride had cost them the expedition.
Spread 6: Karim and Hana watched the cat navigate the acoustic echoes of the hall. Karim realized his formulas needed Hana's spatial intuition, and Hana recognized that her visual tracking required Karim's mathematical precision. When they combined their notes and apologized for their impatience, the bronze chronometer chimed in melodic harmony and glowed with warm amber light.
Spread 7: Working in perfect synergy, Hana mapped the resonant echoes while Karim calibrated the celestial coordinates. CHIME! The bronze chronometer clicked open, revealing the hidden navigational cipher just as the morning sun illuminated the library dome. Karim and Hana embraced with triumphant pride!
Spread 8: Karim and Hana walked back to the sun-drenched library of the coastal academy, presenting the decoded parchment to the expedition captains as the harbor horns sounded. Karim and Hana felt profound fulfillment and mutual respect. Great breakthroughs were born not from individual brilliance, but from the harmonious fusion of complementary minds.`
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
  ],
  "4-5": [
    `نموذج (قصة الاستكشاف والصبر، البطل: "ليث"، الأداة: البوصلة النحاسية):
الصفحة 1: في ركن ورشته المشمس، جلس ليث يمسح بوصلته النحاسية اللامعة. كانت تدور بثبات كلما تحلى ليث بالصبر. حلم ليث باستكشاف الغابة الهامسة.
الصفحة 2: فجأة، هبت نسمة هواء دافئة وحملت ريشة ذهبية براقة. غرد عصفور أزرق جميل عند بوابة الحديقة.
الصفحة 3: ركض ليث بسرعة بين الشجيرات يلاحق العصفور. دارت البوصلة بعنف بين يديه المتعبتين. شعر ليث بالضيق.
الصفحة 4: تفرقت المسارات بين الظلال. توقف ليث حائرا ومتعبا. مرت سلحفاة جبلية قديمة تمشي بهدوء وثبات فوق العشب الأخضر.
الصفحة 5: جلس ليث على صخرة مغطاة بالعشب. توقفت إبرة البوصلة وبدت باردة ومظلمة. شعر ليث بالحزن والوحدة. هفف...
الصفحة 6: جلس ليث ساكنا وأغمض عينيه يستمع لحفيف الرياح. لاحظ أن العشب الأخضر ينمو دائما باتجاه شمس الصباح. أشارت البوصلة إلى الشمال بنور هادئ. شعر ليث بالاطمئنان.
الصفحة 7: مشى ليث بخطوات هادئة وثابتة في طريق النور. توهجت البوصلة بنور ذهبي ساطع عندما وصل إلى عش العصفور المغرد. شعر ليث بالفخر!
الصفحة 8: عاد ليث بريشته الذهبية إلى ركن ورشته المشمس. توهجت بوصلته بنور دافئ. شعر ليث بالسعادة. الصبر والهدوء كانا أجمل بداية لكل استكشاف.`
  ],
  "6-8": [
    `نموذج (قصة التأمل والاكتشاف، البطل: "طارق"، الأداة: الأسطرلاب الفضي):
الصفحة 1: في مرصده الهادئ أعلى البرج، جلس طارق يمسح أسطرلابه الفضي بجانب النافذة الواسعة. كان الأسطرلاب يهمس بنور ناصع كلما تأمل طارق بسكينة وصبر. تمنى طارق اكتشاف نجم البحر المضيء قبل أن تدق أجراس المساء في المدينة.
الصفحة 2: فجأة، لمع بريق زمردي في السماء الصافية تاركا أثرا من الغبار المتلألئ فوق مياه الميناء القديم. طار طائر نورس أبيض ملوحا بجناحيه نحو الخليج الأزرق.
الصفحة 3: اندفع طارق راكضا على درجات البرج الحجرية ونزل مسرعا نحو الشاطئ الرطب. تعثر طارق وسقطت خرائطه في الماء، وتوقف أسطرلابه عن اللمعان. شعر طارق بالغضب والإحباط من تسرعه.
الصفحة 4: بدأ ضوء البريق يتلاشى بين ضباب الساحل الكثيف. وقف طارق بين الصخور المبللة لا يعرف أي ممر يسلك. ظهر فقمة رمادية لطيفة تسبح في الماء الهادئ برفق وصبر عجيب.
الصفحة 5: جلس طارق على جدار صخري قديم. انطفأ ضوء الأسطرلاب الفضي في يديه تماما. شعر طارق بالحزن العميق والرغبة في الاستسلام والعودة خائبا إلى البيت.
الصفحة 6: تنفس طارق بهدوء وراقب الفقمة تتبع حركة الأمواج اللطيفة دون تسرع. أدرك طارق أن الضوء يتجه مع حركة المد الطبيعية للماء وليس مع الرياح. أضاء الأسطرلاب الفضي بنور دافئ. شعر طارق بالأمل والثقة.
الصفحة 7: مشى طارق بخطوات متزنة مع إيقاع الموج الهادئ. توهج الأسطرلاب ببريق زمردي مشرق حين وجد نجم البحر المضيء يستقر بأمان داخل صدفة بيضاء جميلة. شعر طارق بفخر عظيم وسعادة غامرة!
الصفحة 8: صعد طارق درجات مرصده الهادئ أعلى البرج، ووضع نجم البحر المضيء فوق خريطته الكبيرة مع دقات أجراس المساء الدافئة. شعر طارق بالسكينة والبهجة. كان التأمل الهادئ هو المفتاح الحقيقي لاكتشاف عجائب العالم.`
  ],
  "9-12": [
    `نموذج (قصة الإتقان والبراعة، البطلة: "ثريا"، الأداة: ساعة البروج النحاسية):
الصفحة 1: في رحاب ورشة الساعات العائلية الدافئة، جلست ثريا تضبط تروس ساعة البروج النحاسية بدقة بالغة. كانت الساعة تصدر تكتكة منتظمة ونورا ذهبيا خالصا فقط عندما تحافظ ثريا على تركيزها الداخلي وهدوء عقلها. كانت ثريا عازمة على تشغيل طائر اللقلق الآلي قبل انطلاق معرض الحرفيين الكبير لتثبت براعتها كصانعة محترفة.
الصفحة 2: فجأة، سرت هزة خفيفة في طاولات الخشب العتيقة وتساقطت بعض التروس النحاسية على الأرض. ومن خلال النافذة الزجاجية الملونة، اندفعت فراشة آلية فضية ترفرف بجناحيها الدقيقين في حركات سريعة ومضطربة كأن زنبركها الداخلي كاد يفلت.
الصفحة 3: انتاب ثريا قلق مفاجئ، فاندفعت بحماس مفرط ممسكة بمفتاح التثبيت الثقيل لتمسك بالفراشة الفضية قبل هروبها. اصطدم ذراعها بحامل العدسات الزجاجية فتناثرت على البلاط الحجري، واختفت الفراشة داخل مدخنة الورشة وتوقفت ساعة البروج تماما عن الحركة. شعرت ثريا بحسرة عميقة وخيبة أمل شديدة في نفسها.
الصفحة 4: تصاعد رماد خفيف من المدفأة ليحجب أوراق المخططات الدقيقة. وقفت ثريا حائرة تلوم نفسها على تسرعها الذي كاد يدمر جهود أسابيع طويلة. وفي تلك اللحظة، مر قط الورشة العجوز بتمهل فوق العوارض الخشبية العالية، مائلا برأسه نحو المدخنة بترقب ساكن وصبر لا يتزعزع.
الصفحة 5: جلست ثريا على مقعدها الخشبي وأسندت رأسها بين يديها المثقلتين بالتعب. بدت ساعة البروج النحاسية باردة وساكنة في يدها. شعرت ثريا باليأس والإحباط، وفكرت في الانسحاب من المعرض والتوقف عن المحاولة نهائيا.
الصفحة 6: أغلقت ثريا عينيها وتنسمت بهدوء، محاكية سكون القط وصبره المتزن. أدركت ثريا أن الآليات الدقيقة تستجيب للرنين الصوتي الهادئ وليس للإمساك العنيف؛ فالفراشة تنجذب لإيقاع التكتكة المنتظمة. بدأت ساعتها النحاسية تنبض من جديد بنور ذهبي لطيف. شعرت ثريا بصفاء الذهن وعودة العزيمة.
الصفحة 7: وضعت ثريا شوكة الرنين النحاسية برفق على حافة المدفأة ودورت مفتاح ساعتها ببطء متقن. مع انطلاق النغمة الرنانة، هبطت الفراشة الفضية بهدوء واستقرت فوق جناح اللقلق الآلي، لتبدأ التروس كلها بالدوران في تناغم مذهل وبديع. تهلل وجه ثريا بالفخر والاعتزاز بنجاحها!
الصفحة 8: وقفت ثريا في رحاب ورشة الساعات العائلية الدافئة تتابع لمعان أجنحة اللقلق مع شروق شمس الصباح المشرقة. دقت ساعتها النحاسية بإيقاع مطمئن وتوهجت بنور دافئ يملأ القلب. ابتسمت ثريا بسكينة وسعادة غامرة، مدركة أن الإتقان الحقيقي ينبع من الصبر والتناغم الداخلي وليس من العجلة والاندفاع.`
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
  ],
  "4-5": [
    `نموذج (قصة التعاون والمحبة، الأبطال: "طارق" و"ليلى"، الأداة: بوصلة الشمس):
الصفحة 1: في حديقة سطحهما المشمسة، لعب طارق وليلى معا. كانت بوصلة الشمس تلمع بالذهب كلما تعاونا بمحبة وتفاهم. رغب طارق وليلى في مساعدة طائر السنونو الصغير.
الصفحة 2: فجأة، هبت نسمة رقيقة بين أوراق النخيل. سمعا زقزقة ناعمة لطائر سنونو صغير يقف عند السياج متعبا وعطشا.
الصفحة 3: اندفع طارق سريعا بفتات الخبز وصاحت ليلى بحماس. خاف الطائر الصغير وطار بعيدا إلى حافة صخرية عالية. شعر طارق وليلى بالضيق ولوم أحدهما الآخر.
الصفحة 4: وقف الطائر بعيدا لا يستطيعان الوصول إليه. وقف طارق وليلى في صمت وحيرة. مرت سلحفاة الحديقة الهادئة تزحف ببطء ورفق نحو حوض الماء الصغير.
الصفحة 5: جلس طارق عند الجدار شاعرا بالخيبة، وجلست ليلى على المقعد شاعرة بالحزن. انطفأ نور بوصلة الشمس وبدت باردة بين يديهما.
الصفحة 6: راقب طارق وليلى هدوء السلحفاة وصبرها. مد طارق يده لليلى واعتذرت ليلى بلطف وقاسما وعاء الماء معا. أضاءت بوصلة الشمس بنور دافئ. شعرا بالأمل.
الصفحة 7: حمل طارق وعاء الماء بثبات كبير بينما نادت ليلى الطائر بصوت رقيق وهادئ. هبط السنونو وشرب بارتياح من بين أيديهما. شعر طارق وليلى بالفخر والسرور!
الصفحة 8: حمل طارق وليلى بوصلة الشمس وعادا إلى حديقة سطحهما المشمسة بينما غرد السنونو فرحا في السماء. تلألأت البوصلة بنور ذهبي ساطع. شعرا بالسعادة الغامرة. التعاون والرفق كانا أجمل سحر في الحديقة.`
  ],
  "6-8": [
    `نموذج (قصة المغامرة والشراكة، الأبطال: "ريان" و"مايا"، الأداة: المنشور الكريستالي):
الصفحة 1: في كوخ الشجرة الدافئ، جلس ريان ومايا يتأملان خريطة النجوم القديمة بجانب المنشور الكريستالي اللامع. كان المنشور يضيء بنور بنفسجي كلما وثق كل منهما بالآخر وعملا بتعاون هادئ. أراد ريان ومايا تتبع مسار المذنب الليلي من قمة الجبل الصخري.
الصفحة 2: لمع وميض أزرق براق عبر السماء المظلمة ملقيا نوره على الوادي. قفز أرنب جبلي مسرعا بجانب سلم الكوخ وهو يحرك الحصى المضيء بأقدامه الخفيفة.
الصفحة 3: ركض ريان مسرعا في المقدمة بالمصباح بينما تأخرت مايا لتعديل حامل المنظار. وبسبب التسرع، شد كل منهما الخريطة في اتجاه معاكس حتى سقطت في شجيرات الشوك الكثيفة، وانطفأ بريق المنشور الكريستالي. شعر ريان بالغضب وشعرت مايا بالعتب والضيق.
الصفحة 4: كانت الشجيرات الشوكية مظلمة ومسار الجبل غائبا عن الأعين. وقف ريان ومايا في صمت وعناد. هبطت بومة جبلية حكيمة على غصن قريب، تنظر إليهما بعينين واسعتين في سكون ووقار تام.
الصفحة 5: جلس ريان على صخرة عريضة مطرقا برأسه في يأس، وجلست مايا على العشب تحبس دموع خيبة الأمل. رقد المنشور الكريستالي باردا ومظلما بجانبهما.
الصفحة 6: لاحظ ريان ومايا كيف ظلت البومة ساكنة حتى اعتادت عيناها على الظلام التام. اعترف ريان بتسرعه واعتذرت مايا لترددها، وحين تلاقت أيديهما توهج المنشور الكريستالي ببريق بنفسجي دافئ وأخاذ. شعرا بالحماس والترابط مجددا.
الصفحة 7: رفعت مايا المنشور الكريستالي عاليا لينير ظلمات الشوك بينما تحرك ريان بحذر ولطف بين الأغصان واستعاد الخريطة سالمة. وصلا معا إلى قمة الجبل في اللحظة التي عبر فيها المذنب الليلي السماء. هتف ريان ومايا بفرح وفخر عظيمين!
الصفحة 8: عاد ريان ومايا بسلام إلى كوخ الشجرة الدافئ، ووضعا خريطة النجوم بجوار المنشور الكريستالي المتوهج. شعر ريان ومايا بالسعادة العميقة والمودة الصادقة. كان التعاون والثقة المتبادلة هما النور الحقيقي الذي يهدي في أحلك الدروب.`
  ],
  "9-12": [
    `نموذج (قصة التكامل الفكري، الأبطال: "كريم" و"هناء"، الأداة: الميقاتية النحاسية):
الصفحة 1: في رحاب مكتبة الأكاديمية البحرية المطلة على الساحل المشمس، جلس كريم وهناء يدرسان الميقاتية النحاسية العتيقة المستقرة فوق مكتبهما المشترك. كانت الميقاتية تنبض بنور كهرماني متناغم فقط عندما يجمع الباحثان بين مهاراتهما الفكرية بروح الفريق ودون تنافس فردي. كانا عازمين على فك شفرة المخطوطة الملاحية النادرة قبل إبحار أسطول الاستكشاف عند الفجر.
الصفحة 2: هبت نسمة بحرية عليلة عبر الأقواس الحجرية للمكتبة وحركت لفائف المخطوطات القديمة. وفي تلك الأثناء، حلقت يعسوب ذهبية براقة في الفناء، راسمتا مسارات هندسية مضيئة فوق نافورة المزولة الشمسية قبل أن تتوارى نحو أروقة الأرشيف الحجري العتيق.
الصفحة 3: أصر كريم على استخدام المعادلات الحسابية الدقيقة لتوقع مسار اليعسوب، بينما اندفعت هناء لتتبع أثرها البصري سيرا على الأقدام. أدى هذا الاختلاف إلى خطأ كريم في تحديد الإحداثيات وفقدان هناء للأثر بين الممرات المظلمة، فتوقفت الميقاتية النحاسية مع إصدار صوت رنين خافت وحاد. شعر كريم بإحباط مرير وشعرت هناء بالغضب والخذلان.
الصفحة 4: امتدت الظلال الطويلة بين رفوف الكتب الجلدية الضخمة في أقبية الأرشيف، ووجد كريم وهناء نفسيهما عند ممر مسدود. مر قط الأرشيف الماهر بخطوات واثقة وهادئة، متوقفا عند عتبة باب حجري مهجور ومصغيا بانتباه شديد لأصداء الرياح المترددة عبر الشقوق.
الصفحة 5: جلس كريم على درج حجري وأسند جبينه إلى كفيه في حزن شديد، بينما جلست هناء تراقب الميقاتية النحاسية الساكنة. شعر كلاهما بالهزيمة، وظنا أن كبرياءهما وتشبث كل منهما برأيه قد أضاع فرصة المشاركة في رحلة الاستكشاف الكبرى.
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

            const primaryAnchor = blueprint.foundation?.primaryVisualAnchor || 'Special Object';
            const heroDesire = blueprint.foundation?.heroDesire || '';
            const fallbackTrigger = `When ${isDual ? `${heroNameA} and ${heroNameB} act` : `${childName} acts`} with calm kindness and patience, the ${primaryAnchor} glows warm and bright. When rushed, worried, or loud, it dims and cools.`;
            const activeAnchorRule = blueprint.foundation?.anchorTriggerRule || fallbackTrigger;

            const anchorRuleSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANCHOR OBJECT PHYSICAL TRIGGER RULE (CRITICAL MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Anchor Object: "${primaryAnchor}"
Trigger Mechanics: "${activeAnchorRule}"
Spread 1 must state this trigger clearly. Spread 5 must show the object dimming/cooling with failure/worry, Spread 6 must show it responding to insight/calm, and Spread 7 must show it shining with success.
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

            const prompt = NARRATIVE_WRITER_TEMPLATE
                .replace('{{FUNCTION_MAP}}', functionMap)
                .replace('{{EXEMPLARS}}', exemplars)
                .replace('{{HERO_INTRO}}', heroIntro)
                .replace('{{HERO_NAME_RULE}}', heroNameRule)
                .replace('{{PRONOUN_RULE}}', pronounRule)
                .replace('{{HERO_DESIRE_SECTION}}', heroDesireSection)
                .replace('{{ANCHOR_TRIGGER_SECTION}}', anchorRuleSection)
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

