
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
    `EXEMPLAR A (Bedtime Theme, Hero: "Zara", Anchor: Wooden Star Box):
Spread 1: Zara plays on her soft bedroom rug.
Spread 2: Zara holds her wooden star box. Two hands twist the lid to click open.
Spread 3: TAP TAP! A tiny white lamb peeks through the door.
Spread 4: Zara pulls fast with one hand. The wooden lid stays stuck. The shy lamb hides away.
Spread 5: Zara sits down on the rug. Zara feels sad.
Spread 6: Zara sits quiet and calm. Zara uses two hands and turns slowly. CLICK!
Spread 7: The box opens with soft starlight. The lamb hops close and snuggles in Zara's lap.
Spread 8: Zara hugs the sleepy lamb on the soft rug. Sweet dreams, little star!`,

    `EXEMPLAR B (Helping Theme, Hero: "Adam", Anchor: Water Pail):
Spread 1: Adam plays in his sunny garden nook.
Spread 2: Adam holds his green water pail. Two hands tip the spout to pour gently.
Spread 3: BUZZ BUZZ! A thirsty yellow flower droops low in the warm dirt.
Spread 4: Adam tips the pail too fast. SPLASH! Water spills on the grass, missing the roots.
Spread 5: Adam sits down by the stones. Adam feels sad.
Spread 6: Adam sits still and takes a slow breath. Adam holds both handles and tilts slowly.
Spread 7: TRICKLE TRICKLE! Cool water flows softly over the roots. The yellow flower blooms wide!
Spread 8: Adam smiles in his sunny garden nook. Soft and slow made everything grow.`
  ],
  "4-5": [
    `EXEMPLAR A (Adventure Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop, Leo polished his brass compass. Its needle pointed true north only when held flat away from iron buckles.
Spread 2: A sudden breeze swept inside, carrying a bright golden feather. TWEET! A curious bluebird called from the garden gate.
Spread 3: Leo dashed outside chasing the bird, gripping the compass right against his iron belt buckle. The needle spun wild and crooked. Leo felt frustrated.
Spread 4: The forest path split into three leafy turns. CRUNCH CRUNCH! A calm mountain turtle crawled slowly past, heading toward the sunlit moss.
Spread 5: Leo sat down on a mossy boulder. The needle stayed jammed sideways against the iron buckle. Leo felt disappointed. SIGH...
Spread 6: Leo noticed how the turtle moved without any metal clinking. He unclasped his belt and laid the compass flat on wood. CLICK! The needle swung smoothly north.
Spread 7: Leo walked with steady steps along the sunlit moss path. TWEET TWEET! He found the singing bluebird safe in its hollow. Leo cheered proudly!
Spread 8: Leo returned to his sunlit workshop, placing the golden feather in his sketchbook. Leo felt peaceful and happy. Careful hands found the right way.`,

    `EXEMPLAR B (Nature Theme, Hero: "Maya", Anchor: Copper Lantern):
Spread 1: Maya sat on her breezy garden porch with her copper lantern. The lantern shutter opened wide only when the brass latch clicked into the top notch.
Spread 2: FLAP FLAP! A baby barn owl hopped into the jasmine bushes, looking lost and blinking in the dusk.
Spread 3: Maya rushed forward to catch it, tugging the lantern latch sideways with one hurried thumb. The shutter jammed half-shut with a harsh screech. Maya felt upset.
Spread 4: The startled owl fluttered high into an olive branch. RUSTLE RUSTLE! A sleepy garden hedgehog trotted calmly through the dry grass.
Spread 5: Maya sat down beside the flowerbed. The lantern shutter remained stuck crooked in the latch. Maya felt lonely and discouraged. SIGH...
Spread 6: Maya watched the hedgehog pause and listen. Maya set the lantern flat on the stone step, cleared a speck of sand, and aligned the latch to the top notch. CLICK! The shutter slid wide open with a warm steady beam.
Spread 7: Maya held the steady lantern low and hummed softly. HUMMM... The baby owl fluttered down safely onto her outstretched wrist!
Spread 8: Maya carried the sleepy owl back to her breezy garden porch. Maya felt joyful and proud. Gentle patience unlocked every path.`
  ],
  "6-8": [
    `EXEMPLAR A (Discovery Theme, Hero: "Leo", Anchor: Brass Compass):
Spread 1: In his sunlit workshop nook, Leo examined his brass pocket compass. The balanced needle aligned true north only when rested completely level away from iron tools. Leo dreamed of mapping the hidden Whispering Ridge.
Spread 2: A sudden gust swept open the window shutters, blowing in a bright golden feather. TWEET! A bluebird called from the orchard gate, beckoning Leo to follow.
Spread 3: Leo dashed through the brambles chasing the fluttering feather, waving his heavy iron trowel in the same hand as his compass. The magnetic needle spun frantically in useless circles. Leo felt angry and frustrated by his haste.
Spread 4: The trail split into three shadowy forks under the dense pines. Leo stood breathless and confused. CRACKLE! An old mountain tortoise ambled slowly across the pine needles, steering steadily toward the bright mossy clearing.
Spread 5: Leo slumped onto a granite boulder. He dropped his heavy iron tools in the dirt. The compass needle remained frozen off-center. Leo felt defeated and lonely in the quiet forest. SIGH...
Spread 6: Leo watched the tortoise follow the natural slope of the ground. Leo realized the iron trowel had pulled the magnetic needle off course. He set the trowel aside and placed the compass flat on a flat cedar stump. CLICK! The needle swung freely and locked onto true north. Leo smiled with relief.
Spread 7: Leo marched with calm, steady strides toward the north clearing. WHOOSH! He reached the bird's hollow just as the afternoon sun lit the golden feather nest. Leo cheered triumphantly!
Spread 8: Leo returned home to his cozy workshop nook, pinning the golden feather to his completed map. Leo felt joyful and proud. True discovery began with steady focus and careful hands.`,

    `EXEMPLAR B (Nature Theme, Hero: "Maya", Anchor: Copper Lantern):
Spread 1: Maya sat on her breezy garden porch with her copper expedition lantern. The lantern's brass shutter opened wide only when the locking pin clicked firmly into the top groove. Maya loved tending the rare night jasmine.
Spread 2: A sudden rustle stirred the dark hedges. FLAP FLAP! A baby barn owl hopped onto the patio flagstones, blinking its wide amber eyes in search of its nest.
Spread 3: Maya lunged forward eagerly to rescue the owl, yanking the lantern's brass pin with a forceful yank. The pin wedged crooked in the track, trapping the shutter closed. Maya felt distressed and annoyed with herself.
Spread 4: The frightened owl fluttered into the high branches of the fig tree. Maya stood stranded in the twilight. RUSTLE RUSTLE! A mother hedgehog trotted deliberately past the garden stones, unbothered by the growing shadows.
Spread 5: Maya sat down on the stone garden bench. The lantern pin remained wedged tight against the bronze frame. Maya felt disappointed and helpless in the dusk. SIGH...
Spread 6: Maya observed the hedgehog's slow, methodical steps. She blew away the loose grit from the lantern track and tapped the pin straight with her fingertips. CLICK! The shutter slid upward smoothly, casting a bright amber beam across the lawn. Maya felt hopeful.
Spread 7: Maya held the illuminated lantern still and whistled a soft, gentle melody. HUMMM... The baby owl glided down calmly from the fig tree and perched on Maya's sleeve. Maya cheered with boundless joy!
Spread 8: Maya walked the sleepy owl safely back to her breezy garden porch. Her copper lantern rested on the table, gleaming brightly in the night. Maya felt deeply content. Gentle hands and calm patience brought every wanderer home.`
  ],
  "9-12": [
    `EXEMPLAR (Discovery Theme, Hero: "Tariq", Anchor: Silver Astrolabe):
Spread 1: High in his attic observatory, Tariq inspected his silver astrolabe beside the brass skylight. The instrument's horizon ring rotated smoothly only when aligned with the engraved water-level groove. Tariq was determined to chart the rare Comet of the Bay before the midnight festival bells.
Spread 2: A sudden trail of emerald sparks flashed across the harbor sky. WHOOSH! A sea hawk glided past the stone balustrade, angling its wings toward the jagged coastal cliffs.
Spread 3: Tariq bolted down the spiral observatory staircase, sprinting haphazardly across the wet cobblestones while forcing the astrolabe dial with a heavy wrench. The silver gear teeth jammed tight in the casing. Tariq felt furious and frustrated at his reckless impatience.
Spread 4: The emerald spark faded behind the dense maritime fog. Tariq stood stranded among the sharp tidal rocks, unable to measure the comet's trajectory. SPLASH! A harbor seal surfaced smoothly in the calm water, resting motionless against the current before dipping under.
Spread 5: Tariq leaned against a cold seawall, dropping his heavy tools into his satchel. The silver astrolabe was locked solid. Tariq felt crushed and ready to abandon the expedition in bitter disappointment. SIGH... The harbor wind moaned quietly.
Spread 6: Tariq watched the seal's unhurried balance in the tidal swell. He realized forcing the dial had jammed the calibration pin. Tariq cleared the sea spray, loosened the brass thumbscrew, and aligned the horizon ring with the true sea level. CLINK! The precision gears clicked into seamless motion. Tariq felt sharp confidence return.
Spread 7: Tariq measured the exact elevation angle with unhurried precision. CHIME! The astrolabe aligned with the emerald comet trail, revealing the forgotten sea cave observatory. Tariq shouted with triumphant pride!
Spread 8: Tariq climbed back to his attic observatory just as the town bells echoed midnight across the bay. He penned the final comet coordinates onto his chart. Tariq felt deeply fulfilled. Scientific mastery rewarded precision and calm resolve over reckless haste.`
  ]
};

const DUAL_HERO_EXEMPLARS_EN: Record<string, string[]> = {
  "1-3": [
    `EXEMPLAR (Teamwork Theme, Heroes: "Nour" and "Sami", Anchor: Shared Basket):
Spread 1: Nour and Sami play in their sunny yard.
Spread 2: Their woven berry basket has two smooth handles. Two hands on each side keep it level.
Spread 3: CREAK CREAK! A little garden bunny hops by the strawberry patch.
Spread 4: Nour pulls fast, but Sami steps slow. The basket tips sideways! Red berries roll away on the grass.
Spread 5: Nour and Sami sit down on the grass. Nour feels sad. Sami feels shy.
Spread 6: Nour and Sami hold hands. They grasp each handle together and count: One, two, three!
Spread 7: UP UP! Together, they lift the basket level. The little bunny hops close and nibbles a sweet berry.
Spread 8: Nour and Sami cheer together in their sunny yard. Sweet teamwork made the day bright!`
  ],
  "4-5": [
    `EXEMPLAR (Cooperation Theme, Heroes: "Tariq" and "Laila", Anchor: Sun Compass):
Spread 1: Tariq and Laila played on their rooftop patio. Their brass sun compass worked only when both side-mirrors were tilted to meet in the center notch.
Spread 2: CHIRP! A tiny desert swallow fluttered near the garden trellis, looking weary and thirsty in the midday heat.
Spread 3: Tariq jerked the left mirror up while Laila yanked the right mirror down. The misaligned brass arms rattled and jammed shut. Tariq felt frustrated, and Laila felt cross.
Spread 4: The thirsty swallow retreated to a high shade ledge. RATTLE! A calm desert tortoise crawled steadily to the cool fountain basin.
Spread 5: Tariq sat by the trellis wall and Laila sat on the wooden bench. The compass mirrors lay crooked and stuck. Tariq felt discouraged, and Laila felt sad. SIGH...
Spread 6: Tariq and Laila watched the tortoise share the fountain shade. Tariq reached out gently, and Laila apologized. Together, they eased both mirror levers toward the center notch. CLICK! A bright beam of sunlight reflected directly onto the water bowl.
Spread 7: Tariq held the water dish steady while Laila called softly. CHIRP CHIRP! The swallow descended happily and drank from their shared dish. Tariq and Laila cheered!
Spread 8: Tariq and Laila carried their gleaming compass back to the rooftop patio. tariq and Laila felt joyful. Working in harmony was the truest secret to every puzzle.`
  ],
  "6-8": [
    `EXEMPLAR (Adventure Partnership, Heroes: "Rayan" and "Maya", Anchor: Crystal Prism):
Spread 1: In their cozy treehouse workshop, Rayan and Maya inspected their brass crystal prism. The dual lenses focused a sharp rainbow beam only when both side thumbscrews were turned at the exact same speed.
Spread 2: A brilliant blue streak danced across the twilight canyon. WHOOSH! A mountain hare dashed past the ladder, leaving a path of glowing blue footprints.
Spread 3: Rayan cranked his thumbscrew rapidly while Maya turned hers slowly. The mismatched gears snapped out of alignment, and the prism went blurry. Rayan felt annoyed, and Maya felt discouraged.
Spread 4: The glowing hare trail vanished into the misty canyon brambles. SNAP! A wise mountain owl landed quietly on a pine bough, turning its head with slow, balanced grace.
Spread 5: Rayan sat down on a boulder in defeat. Maya knelt by the trail, fighting back tears of disappointment. Their crystal prism remained locked and out of focus. SIGH...
Spread 6: Rayan and Maya observed how the owl moved with steady balance. Rayan counted the rhythm while Maya turned her screw in sync with his hand. CLICK! The brass gears locked into harmony, casting a razor-sharp beam of light through the mist.
Spread 7: Maya aimed the beam high while Rayan parted the brambles to uncover the ancient mountain sundial. WHOOSH! The sundial illuminated with radiant golden light. Rayan and Maya cheered with immense pride!
Spread 8: Rayan and Maya returned safely to their cozy treehouse workshop, setting their crystal prism beside the completed canyon map. Rayan and Maya felt joyful and united. True partnership was the greatest discovery of all.`
  ],
  "9-12": [
    `EXEMPLAR (Scholarly Teamwork, Heroes: "Karim" and "Hana", Anchor: Bronze Chronometer):
Spread 1: In the sun-drenched library of the coastal academy, Karim and Hana examined their antique bronze chronometer. The chronometer's dual escapement gears ticked in unison only when both scholars lowered their counterweight levers simultaneously. They aimed to decode the ancient maritime chart before the morning expedition fleet set sail.
Spread 2: A sudden sea breeze swept through the stone gallery, rustling parchment scrolls. A shimmering golden dragonfly darted across the courtyard sundial before disappearing into the labyrinthine archive vaults. Both scholars watched with intense curiosity.
Spread 3: Karim insisted on forcing the main gear to rush ahead, while Hana tugged the timing wheel backward. Their conflicting forces sheared the alignment pin, freezing the chronometer with a harsh metallic screech. Karim felt bitter frustration, and Hana felt dismissed and angry.
Spread 4: Deep in the archive vaults, shadows lengthened between towering bookcases. Karim and Hana stood stranded at a dead end of stone arches. A seasoned library cat trotted gracefully past, pausing at the threshold of an acoustic chamber to listen to the synchronized echoes of the tide.
Spread 5: Karim slumped against leather folios, holding his head in defeat. Hana sat on the stone bench, staring at the locked chronometer gears. Both felt sorrowful, realizing stubborn pride had halted their work. SIGH... The ocean wind moaned softly through the gallery.
Spread 6: Karim and Hana observed how the cat waited for the rhythm of the waves. Karim apologized for his hasty force, and Hana shared her timing notes. Together, they aligned their levers and released the counterweights at the exact same instant. CHIME! The escapement gears engaged in flawless synchronization.
Spread 7: Working in perfect synergy, Hana tracked the acoustic echoes while Karim calibrated the celestial coordinates on the ticking chronometer. CLICK! The internal brass cylinder slid open, revealing the lost navigational route. Karim and Hana embraced with triumphant pride!
Spread 8: Karim and Hana walked proudly back to the sun-drenched library of the coastal academy, presenting the decoded parchment to the ship captains as harbor horns sounded at dawn. Karim and Hana felt profound fulfillment. Groundbreaking discoveries were forged when sharp minds moved in steady harmony.`
  ]
};

const SINGLE_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة وقت النوم، البطلة: "زارا"، الأداة: برطمان النجوم الخشبي):
الصفحة 1: تلعب زارا فوق بساط غرفتها الناعم.
الصفحة 2: تحمل زارا برطمان النجوم الخشبي. يفتح الغطاء عند لفه باليدين معا بهدوء.
الصفحة 3: طَقْ طَقْ! أطل حمل صغير أبيض من خلف الباب.
الصفحة 4: سحبت زارا الغطاء بيد واحدة بقوة، فبقي الغطاء عالقا. خاف الحمل واختبأ بعيدا.
الصفحة 5: جلست زارا على البساط. شعرت زارا بالحزن.
الصفحة 6: جلست زارا بهدوء وسكينة. أمسكت الغطاء بكلتا يديها ولفته برفق. تِكْ!
الصفحة 7: انفتح البرطمان ببريق ناعم. طَقْ طَقْ! قفز الحمل الصغير وجلس في حضن زارا بسعادة.
الصفحة 8: احتضنت زارا الحمل الصغير فوق بساط غرفتها الناعم. تصبح على خير يا نجمي الجميل!`,

    `نموذج (قصة العطاء والمساعدة، البطل: "آدم"، الأداة: دلو الماء):
الصفحة 1: يلعب آدم في ركن حديقته المشمس.
الصفحة 2: يحمل آدم دلو الماء الأخضر. ينسكب الماء برفق عند إمالة المقبضين بكلتا اليدين.
الصفحة 3: طَنّ طَنّ! مالت زهرة صفراء عطشى فوق التراب الدافئ.
الصفحة 4: أمال آدم الدلو بسرعة كبيرة. طَشّ! انسكب الماء على العشب بعيدا عن الجذور.
الصفحة 5: جلس آدم قرب الحصى. شعر آدم بالحزن.
الصفحة 6: جلس آدم هادئا وتنفس برفق. أمسك المقبضين بكلتا يديه ومال بهدوء.
الصفحة 7: خَرِير خَرِير! سال الماء العذب برفق فوق الجذور. تفتحت الزهرة الصفراء بفرح!
الصفحة 8: ابتسم آدم في ركن حديقته المشمس. الهدوء والرفق جعلا كل شيء ينمو بجمال.`
  ],
  "4-5": [
    `نموذج (قصة الاستكشاف والصبر، البطل: "ليث"، الأداة: البوصلة النحاسية):
الصفحة 1: في ركن ورشته المشمس، جلس ليث يمسح بوصلته النحاسية. كانت إبرتها تستقر نحو الشمال فقط عندما يمسكها مستوية بعيدا عن مشابك الحزام الحديدي.
الصفحة 2: هبت نسمة هواء عبر النافذة وحملت ريشة ذهبية براقة. زَقْزَقَ عصفور أزرق جميل عند بوابة الحديقة داعيا ليث لملاحقته.
الصفحة 3: ركض ليث بسرعة ممسكا البوصلة قرب حزامه الحديدي. دارت الإبرة باضطراب دون اتجاه ثابت. شعر ليث بالضيق والإحباط.
الصفحة 4: تفرقت المسارات بين ظلال الأشجار. خَرْ خَرْ! مرت سلحفاة جبلية قديمة تمشي بهدوء وثبات فوق العشب الأخضر.
الصفحة 5: جلس ليث على صخرة مغطاة بالعشب. بقيت الإبرة مائلة نحو مشبك الحزام. شعر ليث بالحزن وخيبة الأمل. هَفْ...
الصفحة 6: راقب ليث هدوء السلحفاة. فك ليث حزامه الحديدي ووضع البوصلة مستوية فوق الصخرة. طَقْ! استقرت الإبرة بدقة نحو الشمال. شعر ليث بالاطمئنان.
الصفحة 7: مشى ليث بخطوات هادئة متبعا اتجاه الإبرة الثابت. وَجَدَ عش العصفور سالما فوق الغصن. صَاحَ ليث بفرح وفخر!
الصفحة 8: عاد ليث بريشته الذهبية إلى ورشته المشمسة، ووضعها في دفتره. شعر ليث بالبهجة والرضا. التعامل الهادئ والدقيق يفتح كل الطرق.`,

    `نموذج (قصة الطبيعة والرفق، البطلة: "ميس"، الأداة: الفانوس النحاسي):
الصفحة 1: جلست ميس في شرفة حديقتها الهادئة تحمل فانوسها النحاسي. كان مصراع الفانوس ينفتح بضوء واسع فقط عندما يستقر المزلاج في الفتحة العلوية بعيدا عن الرمال.
الصفحة 2: رَفْرَفَ بومة صغيرة بيضاء قرب شجيرات الياسمين، متلفتة بعينيها الواسعتين في عتمة المساء.
الصفحة 3: اندفعت ميس بسرعة لتلتقط البومة، وشدت مزلاج الفانوس بقوة بيد واحدة. علق المزلاج مائلا في المجرى وانغلق المصراع بصوت صرير حاد. شعرت ميس بالانزعاج.
الصفحة 4: طارت البومة خائفة واستقرت فوق غصن زيتون عال. حَفِيف حَفِيف! مر قنفذ صغير يمشي بهدوء وثقة بين الأعشاب الجافة.
الصفحة 5: جلست ميس على حافة الحوض الحجري. بقي مزلاج الفانوس عالقا في مكانه. شعرت ميس بالوحدة والتردد. هَفْ...
الصفحة 6: راقبت ميس هدوء القنفذ وصبره. مسحت ميس حبات الرمل العالقة وثبتت المزلاج بهدوء في الفتحة العلوية. طَقْ! انزلق المصراع واسعا وانطلق ضوء كهرماني دافئ. شعرت ميس بالأمل.
الصفحة 7: حملت ميس الفانوس الثابت ودندنت بصوت عذب رقيق. هَمْس هَمْس... هبطت البومة الصغيرة واستقرت بأمان فوق يد ميس!
الصفحة 8: حملت ميس البومة بهدوء وعادت إلى شرفة حديقتها الهادئة. وضعت فانوسها فوق الطاولة الخشبية. شعرت ميس بفخر وسعادة غامرة.`
  ],
  "6-8": [
    `نموذج (قصة التأمل والاكتشاف، البطل: "ليث"، الأداة: البوصلة النحاسية):
الصفحة 1: في ركن ورشته المشمس، تفحص ليث بوصلته النحاسية الدقيقة. كانت إبرتها المغناطيسية تشير بدقة إلى الشمال فقط عندما تستقر مستوية بعيدا عن الأدوات الحديدية. حلم ليث برسم خريطة وادي الصنوبر السري.
الصفحة 2: هبت عاصفة مفاجئة فتحت مصراعي النافذة، وحملت ريشة ذهبية براقة. زَقْزَقَ عصفور أزرق فوق بوابة البستان ملوحا بجناحيه نحو التلال البعيدة.
الصفحة 3: اندفع ليث راكضا عبر الشجيرات الشائكة ممسكا مجرفته الحديدية الثقيلة في نفس اليد مع البوصلة. دارت الإبرة باضطراب في دوائر عشوائية. شعر ليث بالغضب والضيق من تسرعه.
الصفحة 4: تفرعت الطرق إلى ثلاثة مسارات مظلمة تحت الأشجار الكثيفة. طَقْطَقَة طَقْطَقَة! مرت سلحفاة جبلية عجوز تمشي بتمهل وثبات فوق بساط الأعشاب نحو الممر المضيء.
الصفحة 5: جلس ليث على صخرة غرانيتية ووضع أدواته الحديدية جانبا. بقيت إبرة البوصلة منحرفة ومضطربة. شعر ليث بالهزيمة والوحدة في سكون الغابة. هَفْ...
الصفحة 6: راقب ليث كيف تتبع السلحفاة انحدار الأرض الطبيعي بهدوء. أدرك أن مجرفته الحديدية هي التي شوشت حركة الإبرة المغناطيسية. وضع البوصلة مستوية فوق جذع شجرة جاف. طَقْ! استقرت الإبرة بوضوح نحو اتجاه الشمال. شعر ليث بالارتياح والأمل.
الصفحة 7: تقدم ليث بخطوات واثقة وهادئة نحو التلة الشمالية المشمسة. ووووش! وصل إلى شجرة البلوط العالية حيث يستقر عش العصفور الذهبي. هَتَفَ ليث بفرح وانتصار كبير!
الصفحة 8: عاد ليث إلى ركن ورشته المشمس، وثبت الريشة الذهبية فوق خريطته المكتملة. وضع بوصلته النحاسية بعناية في صندوقها. شعر ليث بالبهجة العميقة. كان التركيز الهادئ مفتاح كل استكشاف حقيقي.`,

    `نموذج (قصة الطبيعة والرفق، البطلة: "ميس"، الأداة: الفانوس النحاسي):
الصفحة 1: جلست ميس في شرفة حديقتها الهادئة تتفحص فانوسها النحاسي المخصص للرحلات. كان مصراع الفانوس ينفتح بضوء واسع فقط عندما يستقر دبوس الإغلاق تماما في المجرى العلوي. عشقت ميس رعاية زهور الياسمين الليلية.
الصفحة 2: تحركت أغصان السياج الأخضر فجأة في عتمة المساء. رَفْرَفَة رَفْرَفَة! قفزت بومة صغيرة بيضاء على بلاط الفناء، متلفتة بعينيها العسليتين الواسعتين بحثا عن دفء عشها.
الصفحة 3: اندفعت ميس بسرعة لتنقذ البومة، وجذبت دبوس الفانوس بقوة خاطفة. انحرف الدبوس في مساره وانحشر بقوة، وظل المصراع مغلقا في الظلام. شعرت ميس بالانزعاج واللوم لنفسها.
الصفحة 4: طارت البومة مرتبكة نحو الأغصان العالية لشجرة التين. حَفِيف حَفِيف! سار قنفذ الحديقة بخطوات واثقة وهادئة فوق الحصى، متتبعا مساره المعتاد دون خوف من العتمة.
الصفحة 5: جلست ميس على المقعد الحجري البارد. ظل دبوس الفانوس محشورا في إطاره البرونزي. شعرت ميس بالحزن والتردد في هدوء المساء. هَفْ...
الصفحة 6: راقبت ميس هدوء القنفذ وصبره. أزالت حبات الغبار الدقيقة عن مجرى الفانوس وضغطت الدبوس بلطف حتى استقام. طَقْ! انزلق المصراع للأعلى وانطلق شعاع كهرماني مشرق أضاء أرجاء الحديقة. شعرت ميس بالأمل والثقة.
الصفحة 7: رفعت ميس الفانوس المضيء بثبات وأطلقت نغمة هادئة رقيقة. هَمْس هَمْس... هبطت البومة الصغيرة من شجرة التين واستقرت بلطف فوق ذراع ميس. صَاحَت ميس بفرح غامر وفخر عظيم!
الصفحة 8: حملت ميس البومة بهدوء وعادت إلى شرفة حديقتها الهادئة. وضعت فانوسها النحاسي فوق الطاولة وهو يلمع بنور دافئ. شعرت ميس بالسكينة والبهجة. الرفق والتمهل ينيران أصعب الدروب.`
  ],
  "9-12": [
    `نموذج (قصة التأمل والاكتشاف العلمي، البطل: "طارق"، الأداة: الأسطرلاب الفضي):
الصفحة 1: في مرصده الهادئ أعلى البرج، عكف طارق على ضبط أسطرلابه الفضي بجانب النافذة الزجاجية الواسعة. كانت حلقة الأفق تدور بسلاسة متناهية فقط عندما تتطابق المؤشرات المنقوشة مع خط الأفق المائي الدقيق. عقد طارق العزم على رصد مذنب الخليج النادر قبل حلول منتصف الليل.
الصفحة 2: لمع خط من الشرر الزمردي عبر سماء الميناء الصافية. ووووش! حلق صقر بحري بمحاذاة الشرفة الحجرية، مائلا بجناحيه نحو المنحدرات الصخرية الشاطئية.
الصفحة 3: اندفع طارق راكضا عبر الدرج الحجري الحلزوني ونزل مسرعا فوق الحصى الرطب وهو يضغط قرص الأسطرلاب بمفتاح ربط ثقيل. علقت التروس الفضية الدقيقة وتوقفت الآلة عن الدوران تماما. شعر طارق بالغضب والإحباط الشديد من تسرعه غير المحسوب.
الصفحة 4: اختفى البريق الزمردي خلف ضباب البحر الكثيف. وقف طارق عاجزا بين الصخور الشاطئية الحادة. رَشّاش رَشّاش! ظهرت فقمة رمادية تطفو بسلاسة فوق المياه الهادئة، مستقرة بتوازن رائع مع حركة الموج الطبيعية.
الصفحة 5: أسند طارق ظهره إلى الجدار البحري البارد، واضعا أدواته الثقيلة في حقيبته. بقي الأسطرلاب الفضي متوقفا في يديه. شعر طارق بالخيبة والمرارة وكاد يستسلم للعودة إلى البيت. هَفْ... ترددت أصوات الرياح الرطبة في هدوء الميناء.
الصفحة 6: تأمل طارق حركة الفقمة المتناغمة مع المد والجزر. أدرك أن الضغط العنيف أخرج مسمار المعايرة عن محوره الدقيق. نظف طارق رذاذ الملح، وأرخى البرغي النحاسي، وأعاد حلقة الأفق لتتطابق مع خط سطح الماء الساكن. طَقْ! دارت التروس الفضية بانسيابية تامة. شعر طارق بتجدد العزيمة والثقة.
الصفحة 7: رفع طارق الأسطرلاب بزاوية الرصد الدقيقة برفق وتأن. رَنِين رَنِين! تطابقت عدسات الأسطرلاب مع مسار المذنب الزمردي، كاشفة عن مدخل الكهف البحري القديم. هَتَفَ طارق بفخر واعتزاز مستحقين!
الصفحة 8: صعد طارق درجات مرصده أعلى البرج مع دقات أجراس منتصف الليل الدافئة. دون إحداثيات المذنب بدقة في سجله الفلكي. شعر طارق بالسكينة والبهجة الغامرة. الاكتشافات الحقيقية تصنعها الدقة الهادئة والروح الصبورة.`
  ]
};

const DUAL_HERO_EXEMPLARS_AR: Record<string, string[]> = {
  "1-3": [
    `نموذج (قصة العمل الجماعي، الأبطال: "نور" و"سامي"، الأداة: السلة المشتركة):
الصفحة 1: يلعب نور وسامي في فنائهما المشمس.
الصفحة 2: يحملان سلة التوت الخشبية بمقبضين ناعمين. تظل السلة مستوية عند رفع المقبضين معا بهدوء.
الصفحة 3: طَقْ طَقْ! قفز أرنب صغير قرب شجيرة الفراولة.
الصفحة 4: شد نور بقوة بينما مشى سامي ببطء. مالت السلة وسقطت حبات التوت الأحمر فوق العشب!
الصفحة 5: جلس نور وجلس سامي على العشب. شعر نور بالحزن وشعر سامي بالخجل.
الصفحة 6: أمسك نور وسامي أيديهما. مسك كل منهما مقبضه وعدا معا: واحد، اثنان، ثلاثة!
الصفحة 7: فَوْق فَوْق! ارتفعت السلة مستوية تماما. اقترب الأرنب الصغير وتناول حبة توت حلوة بسعادة.
الصفحة 8: هَتَفَ نور وسامي معا في فنائهما المشمس. العمل المشترك جعل يومهما رائعا وسعيدا!`
  ],
  "4-5": [
    `نموذج (قصة التعاون والتفاهم، الأبطال: "طارق" و"ليلى"، الأداة: بوصلة الشمس):
الصفحة 1: لعب طارق وليلى في حديقة سطحهما المشمسة. كانت بوصلة الشمس النحاسية تعمل فقط عندما يضبطان ذراعي المرآتين معا نحو الفتحة المركزية.
الصفحة 2: زَقْزَقَ طائر سنونو صغير قرب سياج الحديقة، وبدا متعبا وعطشا تحت شمس الظهيرة.
الصفحة 3: سحب طارق المرآة اليسرى للأعلى بينما جذبت ليلى المرآة اليمنى للأسفل. قَرْقَعَة قَرْقَعَة! انحشرت أذرع البوصلة وتوقفت عن الحركة. شعر طارق بالضيق وشعرت ليلى بالعتب.
الصفحة 4: طار السنونو إلى حافة الظل البعيدة. مرت سلحفاة الحديقة الهادئة تزحف ببطء وثبات نحو حوض الماء الصغير.
الصفحة 5: جلس طارق عند الجدار وجلست ليلى على المقعد الخشبي. بقيت مرايا البوصلة عالقة ومائلة. شعر طارق بالإحباط وشعرت ليلى بالحزن. هَفْ...
الصفحة 6: راقب طارق وليلى هدوء السلحفاة وصبرها. اعتذر طارق بلطف وابتسمت ليلى. وضعا أيديهما معا وحركا ذراعي المرآتين بتزامن هادئ نحو المنتصف. طَقْ! انطلق شعاع ذهبي منعكس مباشرة فوق وعاء الماء.
الصفحة 7: حمل طارق وعاء الماء بثبات بينما نادت ليلى الطائر بصوت رقيق. هبط السنونو وشرب بارتياح وفرح. صَاحَ طارق وليلى بسعادة!
الصفحة 8: عاد طارق وليلى ببوصلتهما النحاسية إلى حديقة السطح. شعر طارق وليلى بالبهجة والمحبة. التعاون الصادق والتمهل كانا أجمل أسرار النجاح.`
  ],
  "6-8": [
    `نموذج (قصة المغامرة والشراكة، الأبطال: "ريان" و"ميس"، الأداة: موشور الكريستال):
الصفحة 1: في ورشة بيتهما الشجري الهادئ، تفحص ريان وميس موشور الكريستال النحاسي. كانت عدسات الموشور تجمع شعاعا ملونا ناصعا فقط عندما يدير الصغيران برغيي الضبط الجانبيين بنفس السرعة تماما.
الصفحة 2: لمع وميض أزرق في سماء الوادي الصافية. ووووش! ركض أرنب جبلي سريع متجاوزا السلم الخشبي، تاركا أثرا من النجوم الزرقاء المضيئة.
الصفحة 3: أدار ريان البرغي بسرعة فائقة بينما حركت ميس برغيها ببطء شديد. طَقْ! اختل توازن التروس النحاسية وانحرف الضوء بعيدا في الضباب. شعر ريان بالإحباط وشعرت ميس بالانزعاج.
الصفحة 4: توارى أثر الأرنب الأزرق بين صخور الوادي الوعرة. حَفِيف حَفِيف! هبطت بومة جبلية حكيمة فوق غصن صنوبر قريب، محركة رأسها بتوازن وهدوء بديع.
الصفحة 5: جلس ريان على صخرة في صمت، بينما جلست ميس على العشب تراقب الضباب الكثيف. ظل الموشور متوقفا وغير متوازن. شعر ريان بالهزيمة وشعرت ميس بالحزن وخيبة الأمل. هَفْ...
الصفحة 6: راقب ريان وميس تناغم حركة البومة وتوازنها. ضبط ريان إيقاع الحركة وتطابقت يده مع يد ميس في تدوير البرغيين بتزامن متقن. طَقْ! التقت التروس بانسجام تام، وانطلق شعاع ضوئي ساطع يشق الضباب.
الصفحة 7: وجهت ميس الشعاع بثبات بينما أزاح ريان الأغصان ليكشفا عن المزولة الصخرية المفقودة. بَرِيق بَرِيق! توهجت المزولة ببريق ذهبي مدهش. هَتَفَ ريان وميس بفخر عظيم وسعادة بالغة!
الصفحة 8: عاد ريان وميس بأمان إلى ورشة بيتهما الشجري، ووضعا موشور الكريستال فوق خريطة الوادي المكتملة. شعر ريان وميس بالبهجة والوحدة الصادقة. التناغم الحقيقي كان أثمن ما اكتشفاه في رحلتهما.`
  ],
  "9-12": [
    `نموذج (قصة التكامل العلمي، الأبطال: "كريم" و"هناء"، الأداة: الميقاتية النحاسية):
الصفحة 1: في رحاب مكتبة الأكاديمية البحرية المشمسة، جلس كريم وهناء يدرسان الميقاتية النحاسية الأثرية. كانت تروس الميزان المزدوجة تدق بإيقاع متناسق فقط عندما يخفض الباحثان ذراعي الثقلين المعاكسين في نفس اللحظة تماما. كان هدفهما فك رموز الخريطة الملاحية قبل إبحار أسطول الفجر.
الصفحة 2: هبت نسمة بحرية عبر الأروقة الحجرية وحركت لفائف المخطوطات. حلقت يعسوب ذهبية في الفناء راسمة مسارات متوهجة قبل أن تختفي في أقبية الأرشيف العتيقة في غموض مشوق.
الصفحة 3: أصر كريم على دفع الترس الأكبر بقوة ليتعجل الدوران، بينما جذبت هناء عجلة التوقيت للخلف. صَرِير صَرِير! انحرف محور التوازن وتوقفت الميقاتية بصوت احتكاك معدني حاد. شعر كريم بالمرارة والإحباط، وشعرت هناء بالغضب لتجاهل رأيها.
الصفحة 4: امتدت الظلال الطويلة بين خزائن الكتب الجلدية في قبو الأرشيف. وقف كريم وهناء عند ممر مسدود تماما. سار قط المكتبة الخبير بخطوات واثقة وهادئة، متوقفا عند مدخل القاعة الرخامية ومصغيا لتناغم أصداء أمواج البحر المترددة عبر الشقوق.
الصفحة 5: جلس كريم على عتبة حجرية واضعا يديه فوق رأسه، بينما جلست هناء تراقب الميقاتية الساكنة. شعر كلاهما بالأسف، وأدركا أن العناد والتعجل أوقفا التقدم. هَفْ... تناهت أصوات الرياح الشاطئية في صمت المكان.
الصفحة 6: تأمل كريم وهناء ترقب القط وإصغاءه لإيقاع الأمواج الطبيعي. اعتذر كريم عن تسرعه، وشاركت هناء حساباتها التوقيتية بروح مرحبة. وضعا أيديهما على الذراعين وأنزلا الثقلين بتطابق تام في نفس الثانية. رَنِين رَنِين! دارت التروس في توافق موسيقي مذهل.
الصفحة 7: بتعاون وثيق وتكامل كامل، حددت هناء اتجاه الأصداء الصوتية بينما ضبط كريم إحداثيات البوصلة الفلكية على دقات الميقاتية المنتظمة. طَقْ! انفتحت الأسطوانة النحاسية الداخلية كاشفة عن المسار الملاحي السري. تعانق كريم وهناء بفخر واعتزاز غامرين!
الصفحة 8: سار كريم وهناء بثقة عائدين إلى قاعة الأكاديمية المشمسة، وسلما الخريطة المفكوكة لقادة الأسطول مع انطلاق أبواق السفن في الميناء عند الشروق. شعر كريم وهناء ببهجة عميقة وامتنان متبادل. النجاحات الكبرى تولد من التناغم الصادق بين العقول الصبورة.`
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
8. STRICT CAUSE-FIRST ANCHOR MECHANIC (ZERO TOLERANCE FOR MOOD-RING TROPES):
   - The anchor object/tool is NEVER an emotion detector or psychic mood ring (never write: "the pebble glowed when happy and dimmed when sad", or "his lantern lights up with his curiosity").
   - The anchor object MUST operate purely via observable physical mechanisms (e.g. clicking a latch into a slot, twisting a lid with two hands, sliding a notch, leveling away from metal, turning a dial).
   - When operated incorrectly, it jams or resets physically; when adjusted properly, it unlocks physically.
9. READ-ALOUD ONOMATOPOEIA MANDATE:
   - Every spread MUST include at least one vivid, joyful, or evocative sound word (e.g. In English: TAP TAP!, WHOOSH!, CLICK!, SPLASH!, CRUNCH!, SIGH..., HUMMM...; In Arabic: طَقْ طَقْ!, ووووش!, زَقْزَقَ!, تِكْ تِكْ!, خَرِير خَرِير!, هَفْ..., هَمْس هَمْس!).
10. CLICHÉ PLOT BAN:
   - STRICTLY DO NOT write cliché "fear of the dark" or "scary shadows that turn out to be ordinary toys/clothes" stories. Focus on proactive wonder, curious exploration, and joyful discoveries.
11. EMOTION-ACTION NON-REDUNDANCY:
   - Do NOT redundantly state an emotion and then make an object react to that emotion in successive sentences (avoid: "Leo felt sad. The compass dimmed."). Keep feelings named simply for the child, and let physical actions explain the state of the world.
12. Arabic Output Rules (CRITICAL FOR AGE-APPROPRIATE STORYTELLING):
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

