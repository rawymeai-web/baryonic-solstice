
import type { StoryData } from '../types';

interface ThemeContent {
    heritageContext: string;
    visualStyle: string;
    goals: string[];
    challenges: string[];
    // Optional override pools for single-hero mode
    singleHeroGoals?: string[];
    singleHeroChallenges?: string[];
}

const themeLibrary: Record<string, ThemeContent> = {
    'val-sleep': {
        heritageContext: "The Vast Arabian Night & Bedouin Hospitality.",
        visualStyle: "Indigo/gold palette, Mashrabiya patterns, glowing crescent moon.",
        goals: [
            "To tuck the baby moon into its cloud blanket before sunrise.",
            "To collect all the runaway stars and return them to the night sky.",
            "To find the magical lullaby hidden inside the old Dallah coffee pot.",
            "To race the sandman to the dreaming dunes before the desert cools.",
            "To light the lanterns of the Dream Souq before the night children arrive."
        ],
        challenges: [
            "The 'Noisy Giggles' that bounce around the tent and keep everyone awake.",
            "A mischievous djinn who hides pillows under the palm trees.",
            "The lantern light that keeps luring curious desert butterflies inside.",
            "A baby camel that lost its sleepy song and needs comforting.",
            "The excitement of tomorrow's big pearl diving trip."
        ]
    },
    'val-respect': {
        heritageContext: "The Majlis and the Wisdom of Roots.",
        visualStyle: "Cedar wood textures, Zellige tiles, golden Dallah (coffee pots).",
        goals: [
            "To carry the Dallah of respect to the elder of the ancient Majlis.",
            "To find the wise old turtle who guards the secrets of the wadi.",
            "To help Jiddo (grandfather) repair the treasure chest of family memories.",
            "To listen to the Sidr tree's story before the desert wind carries it away.",
            "To earn the golden thobe pin given only to the most respectful young one."
        ],
        challenges: [
            "Staying patient and quiet during a long and important elder's story.",
            "The 'Interruption Imps' who whisper distracting things during the Majlis.",
            "Crossing the river of echoes without repeating unkind words.",
            "Learning to greet the Mountain Guardian in the ancient tongue.",
            "Waiting for the slowest member of the caravan without rushing ahead."
        ]
    },
    'val-teamwork': {
        heritageContext: "The Bond of the Tribe and the Pearl Divers.",
        visualStyle: "Coastal blues, nautical ropes, sparkling pearl finishes.",
        goals: [
            "To haul up the giant net full of glowing pearls together before the tide turns.",
            "To sail the small dhow safely home by working the sails as a team.",
            "To build a Barasti shelter before the evening tide comes in.",
            "To solve the puzzle of the twin lighthouses flashing in the Arabian Gulf.",
            "To carry the Falaj water channel stones together to save the oasis garden."
        ],
        challenges: [
            "Learning to row the dhow in the same direction at the same time.",
            "Sharing the ship captain's hat fairly so everyone feels important.",
            "A sudden Gulf squall that mixes everyone's jobs on the boat.",
            "Agreeing on which route across the coral reef is the safest.",
            "The 'Solo Spirit' — a pesky little voice that says 'I can do it faster alone!'"
        ]
    },
    'val-bravery': {
        heritageContext: "The Bravery of the Desert Knight.",
        visualStyle: "Pristine whites, golden falcon wings, starlit desert sky.",
        goals: [
            "To climb to the top of the tall sand dune to rescue the falcon's lost feather.",
            "To speak up at the Majlis and share an important idea with the elders.",
            "To walk through the dark date palm grove to save the baby hedgehog.",
            "To try the new food at the big family feast without making a face.",
            "To be the first one to jump into the cool, clear wadi water."
        ],
        challenges: [
            "The long shadows in the date grove that look a bit like giants at night.",
            "The crowd of cousins all watching and waiting at the Majlis.",
            "Knees that wobble at the edge of the high dune.",
            "A stomach that feels like it has sand inside it before the big moment.",
            "The little voice that says 'what if I'm not brave enough?'"
        ]
    },
    'val-honesty': {
        heritageContext: "The Clarity of the Oasis Spring.",
        visualStyle: "Crystal clear water reflections, bright sunbeams, lush palm greenery.",
        goals: [
            "To return the shopkeeper's extra change at the old Souq before closing time.",
            "To tell the truth about the broken falcon perch to the keeper.",
            "To find the crystal-clear spring by following the honest path, not the shortcut.",
            "To speak the true words that unlock the Door of the Oasis Garden.",
            "To clean the muddy reflection in the Falaj so the truth can shine through."
        ],
        challenges: [
            "The 'Fog of Little Lies' that blurs the path through the desert.",
            "The tempting shortcut that promises to hide the broken thing forever.",
            "The heavy, heavy weight of a secret carried in a small pocket all day long.",
            "The fear that telling the truth will mean missing the camel race.",
            "The 'maybe they won't notice' whisper that floats on the hot desert breeze."
        ]
    },
    'val-helping': {
        heritageContext: "Planting the Ghaf Tree (The National Tree of Giving).",
        visualStyle: "Earthy tones, detailed Ghaf leaf textures, warm communal energy.",
        goals: [
            "To water every single thirsty Ghaf tree in the neighbourhood before sunset.",
            "To bring the heavy shopping bags home for the tired neighbour, Um Khalid.",
            "To help rebuild the sand castle that the little ones worked so hard on.",
            "To deliver fresh dates to every home on the lane during Ramadan.",
            "To dig the little channel so the Falaj water reaches the struggling garden."
        ],
        challenges: [
            "The water bucket is very heavy and the garden is very far away.",
            "The afternoon sun is blazing hot on the helping-trail.",
            "Choosing to help instead of going to play football in the courtyard.",
            "Bringing enough dates for everyone without eating too many on the way.",
            "Getting dusty hands digging the channel right before the family arrives."
        ]
    },
    'val-tidy': {
        heritageContext: "Protecting the Beauty of our Land.",
        visualStyle: "Clean geometric compositions, soft pastel 'organized' spaces.",
        goals: [
            "To sort all the toys and books before Teta (grandmother) comes to visit.",
            "To collect every piece of litter from the beautiful Corniche promenade.",
            "To organize the colourful spice jars in the kitchen Souq cabinet.",
            "To fold all the prayer rugs neatly before the call to prayer echoes.",
            "To return every storytelling carpet to its rightful scroll in the library tent."
        ],
        challenges: [
            "The 'Chaos Djinn' that un-folds everything the moment you turn away.",
            "Finding the right jar for each spice when they all look the same.",
            "The irresistible distraction of an old toy found buried in the pile.",
            "The Corniche is very long and there seems to be litter around every bend.",
            "Folding the big, silky prayer rugs alone without them sliding away."
        ]
    },
    'val-sharing-toys': {
        heritageContext: "The Tradition of the Shared Plate (Karam).",
        visualStyle: "Warm candlelight, rich textile patterns (Sadu), generous portions.",
        goals: [
            "To set a beautiful shared Machboos feast where everyone gets a golden piece.",
            "To let the visiting cousin borrow the favourite toy camel for the whole day.",
            "To divide the box of special Ramadan sweets so every child gets their share.",
            "To open the toy chest at Eid and let all the younger cousins choose first.",
            "To trade Sadu woven friendship bracelets in the Market of Joy."
        ],
        challenges: [
            "The fear that sharing the toy camel means it might come back a little dented.",
            "Looking at the cousin's happy face while they enjoy YOUR favourite sweet.",
            "The 'Mine-Mine Bird' squawking very loudly in the ear during Eid morning.",
            "Waiting to eat at the Machboos table until every single guest is seated.",
            "Understanding that Karam (generosity) always fills your heart back up double."
        ]
    },
    'val-school': {
        heritageContext: "The House of Wisdom (Bayt al-Hikmah).",
        visualStyle: "Floating books, magical chalk dust, owl motifs, starlit libraries.",
        goals: [
            "To solve the riddle written on the ancient Souq blackboard by the old teacher.",
            "To earn the shining badge of the 'Curious Explorer' from the Owl Scholar.",
            "To find the hidden Library of All Answers inside the old Arabian fort.",
            "To teach the baby desert fox a new word before the school bell rings.",
            "To collect all five golden seals of knowledge from the Bayt al-Hikmah."
        ],
        challenges: [
            "The 'Butterfly of Distraction' that flutters past the classroom window.",
            "Feeling shy about raising a hand to ask the giant wise Owl a question.",
            "The new school bag feeling very heavy with so many exciting new books.",
            "Getting lost in the long, treasure-filled Hall of Learning Hallways.",
            "Missing the warmth of home during the very first day of school."
        ]
    },
    'val-potty': {
        heritageContext: "The Rite of Passage to Growing Up.",
        visualStyle: "Gold and royal blue, sparkle effects, trumpets, clean white marble.",
        goals: [
            "To become the official Royal Guardian of the Golden Palace Throne.",
            "To wave goodbye to the Nappy Kingdom and collect the Big Kid Crown.",
            "To master the secret flushing waterfall power all by oneself.",
            "To earn the sparkling 'Big Kid Thobe/Abaya' from the Growing-Up Fairy.",
            "To light the celebratory Eid sparkler that only brave big kids can hold."
        ],
        challenges: [
            "Learning to hear the body's very quiet and important secret signal in time.",
            "Pausing an extremely exciting game of sand-castle building to answer the signal.",
            "Sitting still on the tall grown-up seat without wobbling.",
            "The surprising sound of the waterfall flush in the echoing marble bathroom.",
            "Remembering to wash hands with the lovely rose-water soap after."
        ]
    },
    // val-siblings: Two completely different story paths based on 1 vs 2 heroes.
    'val-siblings': {
        heritageContext: "The Bond of the Arabian Family and the Wisdom of Nature.",
        visualStyle: "Warm golden light, lush garden greens, soft duo framing, connected pathways.",

        // DUAL-HERO PATH: The two real heroes interact and learn the value directly.
        goals: [
            "To fix the broken lantern together before Grandmother's Eid dinner begins.",
            "To get the lost kite unstuck from the old fig tree by working as a team.",
            "To haul the heavy basket of dates home before the evening call to prayer.",
            "To finish building the Barasti den together before the rain comes in.",
            "To pack the Iftar picnic basket together so no one is left carrying everything."
        ],
        challenges: [
            "One hero wants to carry everything alone, the other wants to do it a different way.",
            "An argument about whose idea is better slows everything down.",
            "One gets tired and the other must decide — push on alone, or wait and help?",
            "The task is impossible for one person but feels too crowded with two trying at once.",
            "A moment where one hurts the other's feelings without meaning to — and must repair it."
        ],

        // SINGLE-HERO PATH: Hero observes animals in nature and learns the value by watching.
        singleHeroGoals: [
            "To understand why the two young falcon chicks always hunt together and never alone.",
            "To find out how the oryx calves always know where to go — because they follow each other.",
            "To discover why the baby turtles always race to the sea in a group, never one by one.",
            "To learn the secret of how the pearl-diving dhow crew hauls up the net that no one person can lift.",
            "To figure out why the desert ants can carry the date seed, but only when they walk in a line."
        ],
        singleHeroChallenges: [
            "The hero tries to solve the same problem alone — and gets stuck, just like the lone animal did.",
            "One animal breaks away from the group and immediately struggles — the hero watches carefully.",
            "The hero tries to lift something heavy alone first, fails, and must think about what the animals did differently.",
            "The hero gets bored watching and wanders off — but comes back just in time to see the key moment.",
            "The hero doesn't understand at first why the animals keep waiting for the slowest one in the group."
        ]
    },

    'adv-lost-found': {
        heritageContext: "Falconry (Al Miqnas) and the Singing Dunes.",
        visualStyle: "Wide-angle desert vistas, soaring falcon silhouettes, orange/teal contrast.",
        goals: [
            "To follow the falcon's circles in the sky and find the lost baby oryx.",
            "To return the pearl necklace found in the sand to its rightful Souq owner.",
            "To trace the caravan's tracks back across the dunes and find what was dropped.",
            "To recover the singing dune's stolen echo and restore the desert's music.",
            "To find the small brass compass that points the way home through the fog."
        ],
        challenges: [
            "The desert wind that sweeps the footprints away as fast as you can follow them.",
            "A clever desert fox who speaks only in riddles and guards the clue.",
            "The shimmering heat haze makes everything look far away and wobbly.",
            "Night is falling fast and the dunes look different in the dark.",
            "The falcon is circling — but which direction is it pointing today?"
        ]
    },
    'adv-mini-nature': {
        heritageContext: "The Hidden Aflaj in a Palm Grove.",
        visualStyle: "Dappled sunlight through palm leaves, sparkling water, vibrant dragonflies.",
        goals: [
            "To gently guide the lost dragonfly back to the cool Aflaj water channel.",
            "To find the rare date palm flower that blooms only once a year at dawn.",
            "To follow the trail of the golden dung beetle across the garden stones.",
            "To help the desert hedgehog find a safe crossing over the garden wall.",
            "To fill a tiny jar with morning dew from the biggest palm leaf for the fairies."
        ],
        challenges: [
            "Being absolutely quiet enough to not startle the shy little creatures away.",
            "The tall grass around the Aflaj is like a soft, green maze of paths.",
            "The dawn comes very early and the alarm of the morning birds is easy to sleep through.",
            "Crossing the narrow Aflaj channel without getting the best shoes wet.",
            "Not picking the flower — just looking closely and that is the real adventure."
        ]
    },
    'adv-city': {
        heritageContext: "The Sensory Magic of the Old Souq.",
        visualStyle: "Crimson saffron piles, glowing lanterns, bustling market energy.",
        goals: [
            "To find the secret spice shop hidden behind the third blue door of the Old Souq.",
            "To deliver the beloved Uncle's lost Khanjar back to his stall before closing.",
            "To gather all seven Ramadan lantern colours from the different Souq lanes.",
            "To catch the runaway gold thread ball before it tangles every carpet stall.",
            "To find the street of the calligraphers that doesn't appear on any modern map."
        ],
        challenges: [
            "The winding Souq alleyways that twist and turn and look the same.",
            "The wonderful smell of cardamom and saffron that makes you want to stop and sniff forever.",
            "Navigating politely through the crowd of tall, busy grown-up shoppers.",
            "The beautiful toys in the shop windows that call out 'buy me! buy me!'",
            "The old Souq closes exactly at sunset — and the sun is moving fast."
        ]
    },
    'adv-animal': {
        heritageContext: "The Mystery of the Arabian Oryx.",
        visualStyle: "Ethereal moonlight, silvery Oryx coats, glowing desert flora.",
        goals: [
            "To find the lost baby oryx calf and guide it safely back to its herd.",
            "To carry fresh desert grass to the tired old Arabian horse at the farm.",
            "To help the confused migratory bird find the right direction on its long journey.",
            "To earn the trust of the wild desert fox by being patient and very still.",
            "To call back the escaped racing camel before the big race in the morning."
        ],
        challenges: [
            "Animals only communicate through gentle sounds and body language — no words.",
            "Moving softly and slowly across the loud, crunchy desert pebble floor.",
            "Crossing the wide wadi river that the animals use as their road.",
            "Earning the animal's trust takes patience and sitting very, very still.",
            "The desert is wide and the herd moves fast under the silver moon."
        ]
    },
    'adv-magic': {
        heritageContext: "1001 Nights & The Flying Carpet.",
        visualStyle: "High-altitude views, intricate carpet fringes, wind-blown hair.",
        goals: [
            "To steer the Sadu-patterned flying carpet safely home before it rains.",
            "To learn the three Arabic words that make broken toys whole again.",
            "To capture a glowing jar of desert starlight to keep the camp lantern burning.",
            "To find the Genie's lost brass lamp rolling around in the old Souq basement.",
            "To polish the magic Dallah coffee pot and politely ask it for one good wish."
        ],
        challenges: [
            "The flying carpet has a very strong opinion about which direction to go.",
            "The magic words sound simple but must be pronounced exactly right in Arabic.",
            "Carrying a jar of starlight without letting any of the sparkle spill out.",
            "The Genie's lamp keeps rolling into different Souq stalls and hiding.",
            "The magic only works for the pure of heart — no trickery allowed."
        ]
    },
    'adv-fantasy': {
        heritageContext: "The Legend of the Sea Djinn.",
        visualStyle: "Bioluminescent corals, turquoise water, shimmering scales.",
        goals: [
            "To protect the glowing coral garden from the Shadow Jellyfish invasion.",
            "To sail the Bed-Dhow safely to the edge of the glowing Sea of Dreams.",
            "To climb to the top of the Lighthouse of Imagination before the light goes out.",
            "To rescue the little merfolk child from the Cave of Forgotten Songs.",
            "To map the undiscovered islands of the Gentle Arabian Fantasy Sea."
        ],
        challenges: [
            "The bedroom floor has turned completely into sparkling Arabian Gulf water!",
            "The wardrobe door is slowly, quietly opening and something magical is coming.",
            "Dark shadows on the wall look very big when the night light flickers.",
            "Running out of imagination power just before reaching the lost island.",
            "The Djinn's riddle must be answered in three heartbeats or the adventure resets."
        ]
    },
    'adv-treasure': {
        heritageContext: "The Lost City of Ubar.",
        visualStyle: "Red sandstone textures, ancient carvings, dusty sunbeams.",
        goals: [
            "To decode the ancient Nabataean inscription carved into the Hegra canyon wall.",
            "To find the treasure chest of Ubar buried beneath the shifting red dunes.",
            "To solve the three riddles of the Sphinx of the Lost City at the golden gate.",
            "To uncover the lost recipe scroll for the world's most delicious Luqaimat.",
            "To find the key that was dropped into the old Arabian falaj centuries ago."
        ],
        challenges: [
            "The ancient map is written in faded script that needs a magnifying glass.",
            "A very friendly but very unhelpful talking hoopoe bird keeps pointing the wrong way.",
            "Digging through the hot, heavy sandstone in the midday heat.",
            "The trap of beautiful sparkling gems that distract from the real treasure.",
            "Sharing the discovered treasure fairly with every member of the expedition."
        ]
    },
    'adv-dino': {
        heritageContext: "Prehistoric Arabia.",
        visualStyle: "Deep jungle greens, massive scale contrasts, prehistoric mist.",
        goals: [
            "To walk alongside the giant gentle dinosaurs through the ancient Arabian forest.",
            "To save the dinosaur egg from rolling into the bubbling prehistoric wadi.",
            "To find the rare healing leaf that grows only at the top of the volcano.",
            "To teach the lonely baby dinosaur how to find its family again.",
            "To hide safely in the ancient Arabian cave shelter as the meteor shower begins."
        ],
        challenges: [
            "Not getting accidentally stepped on by the very friendly but very clumsy giant.",
            "The dinosaur roars echo so loudly they shake the date palm fruit down.",
            "The prehistoric ground shakes and rumbles every time the giant herd passes.",
            "Finding food that grew millions of years before the first Souq existed.",
            "The prehistoric volcano is beginning to glow orange at the very top."
        ]
    },
    'adv-space': {
        heritageContext: "The Hope Probe & Mars Mission.",
        visualStyle: "Cosmic purples, high-tech suits, the blue marble of Earth.",
        goals: [
            "To plant the Arab Hope Probe flag on the red mountains of planet Mars.",
            "To fix the satellite dish that broadcasts all the GCC children's bedtime stories.",
            "To find a new planet for the lonely Star-Plant to grow in the universe.",
            "To race a shooting star all the way around the rings of Saturn and back.",
            "To meet the kind Moon Guardian and return the Earth's borrowed moonbeam."
        ],
        challenges: [
            "Dodging the very bumpy Asteroid Belt of the Great Unknown.",
            "Zero gravity makes walking sideways, upside down, and in circles all at once.",
            "The rocket engine needs 'Imagination and Determination' fuel to start.",
            "Space is very quiet and very vast and tomorrow feels very far away.",
            "The Star Map is written in a language of spinning constellations, not words."
        ]
    },
    'adv-pyramid': {
        heritageContext: "The Rock Tombs of Hegra.",
        visualStyle: "Dramatic lighting, ultra-detailed rock, cinematic scope.",
        goals: [
            "To open the sealed Hegra rock tomb door and find what is waiting inside.",
            "To wake the ancient stone guardian and ask it the secret of the old kingdom.",
            "To light every single ancient torch in the dark labyrinth before the oil runs out.",
            "To return the lost scroll of riddles to its carved niche in the Hegra wall.",
            "To find the room where the ancient Nabataean children painted the ceiling."
        ],
        challenges: [
            "Answering the carved stone guardian's three impossible-sounding questions.",
            "The ancient torch keeps flickering out in the windless underground chamber.",
            "The Hegra labyrinth's sandstone corridors all look exactly the same.",
            "Deciphering the Nabataean carvings using only the faded drawings as clues.",
            "The very ticklish feeling of many, many little golden scarab beetles underfoot."
        ]
    },
    'adv-cooking': {
        heritageContext: "The Royal Kitchens of the Sultan.",
        visualStyle: "Flour clouds, colourful ingredients, warm oven glow, copper pots.",
        goals: [
            "To bake the most enormous and delicious Ka'ak Eid biscuits the family has ever seen.",
            "To find the last missing secret spice — the pinch of rose water — for the royal Umm Ali.",
            "To cook a great Ramadan Iftar feast for the whole hungry neighbourhood.",
            "To win the Golden Wooden Spoon in the Great Children's Cook-Off.",
            "To recreate Great-grandmother's legendary Balaleet recipe from memory and taste."
        ],
        challenges: [
            "The Eid dough keeps growing and growing until it fills the whole kitchen!",
            "The royal recipe is written in invisible ink that only appears when sprinkled with saffron.",
            "The naughty 'Salt Sprite' who sneaks in to make everything too salty.",
            "The great oven is a grumpy, sleepy dragon that must be woken politely.",
            "All the best ingredients keep sprinting around the kitchen trying to escape."
        ]
    }
};

export function getGuidelineForTheme(storyData: StoryData, useSecondCharacter?: boolean): string {
    const themeId = storyData.themeId || '';
    const themeContent = themeLibrary[themeId];

    if (!themeContent) {
        return `
**Theme:** A custom story about "${storyData.theme}"
*   **Narrative Design:** Ensure {child_name} is the architect of their own success.
*   **Setting:** Root the story in a setting that best matches the theme.
*   **Planner Logic:**
    - Pages 1-2: Setup in a familiar, warm environment.
    - Page 3: The Call to Adventure/Discovery.
    - Pages 4-5: The Imaginative Peak (The Challenge).
    - Page 6: The Moment of Realization/Growth.
    - Pages 7-8: The Heroic Return/Satisfaction.
*   **Visual Tribute:** Use rich textures and "Safe Wonder" lighting.
`;
    }

    // --- ROUTING: pick the correct goal/challenge pool based on hero count ---
    // If this theme has a single-hero override and we are NOT using a second character,
    // use the dedicated single-hero animal-observation pool instead of the dual-hero pool.
    const isSingleHero = !useSecondCharacter;
    const goalPool = (isSingleHero && themeContent.singleHeroGoals?.length)
        ? themeContent.singleHeroGoals
        : themeContent.goals;
    const challengePool = (isSingleHero && themeContent.singleHeroChallenges?.length)
        ? themeContent.singleHeroChallenges
        : themeContent.challenges;

    // FIX: Truly randomize goal & challenge every single run.
    const randomGoalIndex = Math.floor(Math.random() * goalPool.length);
    const randomChallengeIndex = Math.floor(Math.random() * challengePool.length);
    const goal = storyData.customGoal || goalPool[randomGoalIndex];
    const challenge = storyData.customChallenge || challengePool[randomChallengeIndex];

    let contextLock = "";
    if (themeId) {
        const parts = themeId.split('-');
        const category = parts[0];
        const name = parts[1];
        contextLock = `STRICT SETTING LOCK: This is a ${category} story specifically about ${name}. Do NOT use generic 'backyards' or 'gardens' unless that is the Heritage Context below.\n`;
    }

    // Extra narrative directive for the sibling theme in single-hero mode
    const siblingDirective = (themeId === 'val-siblings' && isSingleHero) ? `
**SIBLING VALUE — SINGLE HERO MODE (CRITICAL NARRATIVE RULE):**
- There is NO second hero or sibling character in this story.
- The hero MUST learn the value of helping and supporting a sibling by OBSERVING animals in nature (e.g., falcon chicks, oryx calves, desert ants, baby turtles).
- The story structure is: Hero notices animals helping each other → Hero tries the same challenge alone and struggles → Hero understands why the animals do not work alone → Hero internalizes the lesson.
- DO NOT invent a sibling, brother, or sister character. The lesson comes entirely through animal observation.
- The animal(s) observed MUST be regionally appropriate: Arabian oryx, falcons, desert ants, dhow crew, baby turtles on the coast, etc.
` : '';

    return `${contextLock}${siblingDirective}
**Heritage Context:** ${themeContent.heritageContext}
**Goal:** ${goal}
**Challenge:** ${challenge}
**Visual Style:** ${themeContent.visualStyle}
**Planner Beats:**
1. **Setup:** {child_name} starts in a setting reflecting: ${themeContent.heritageContext}
2. **Catalyst:** They set out to: ${goal}
3. **Escalation:** They face the obstacle: ${challenge}
4. **Shift:** They overcome it using the values of the theme.
5. **Resolution:** They achieve the goal and return changed.
`.replace(/{child_name}/g, storyData.childName)
        .replace(/{child_age}/g, storyData.childAge);
}


export function getGuidelineComponentsForTheme(themeId: string): { goal: string; challenge: string; illustrationNotes: string } | null {
    const theme = themeLibrary[themeId];
    if (!theme) return null;

    const randomGoal = theme.goals[Math.floor(Math.random() * theme.goals.length)];
    const randomChallenge = theme.challenges[Math.floor(Math.random() * theme.challenges.length)];

    return {
        goal: randomGoal,
        challenge: randomChallenge,
        illustrationNotes: theme.visualStyle
    };
}
