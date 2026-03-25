
import type { StoryData } from '../types';

interface ThemeContent {
    heritageContext: string;
    visualStyle: string;
    goals: string[];
    challenges: string[];
}

const themeLibrary: Record<string, ThemeContent> = {
    // --- VALUES ---
    'val-sleep': {
        heritageContext: "The Vast Arabian Night & Bedouin Hospitality.",
        visualStyle: "Indigo/gold palette, Mashrabiya patterns, glowing crescent moon.",
        goals: [
            "To prepare for the great Dream Festival.",
            "To recharge magic powers for tomorrow.",
            "To catch the falling stars before they fade.",
            "To find the softest cloud for the Moon to rest on.",
            "To visit the Castle of Sleep."
        ],
        challenges: [
            "The 'Noisy Giggles' keeping everyone awake.",
            "The Tickle-Monster lurking under the bed.",
            "The bright lights of the Firefly Parade.",
            "A lost lullaby that needs to be sung.",
            "The excitement of tomorrow's big race."
        ]
    },
    'val-respect': {
        heritageContext: "The Majlis and the Wisdom of Roots.",
        visualStyle: "Cedar wood textures, Zellige tiles, golden Dallah (coffee pots).",
        goals: [
            "To learn the secret of the 'Oldest Star'.",
            "To help the Ancient Living Tree.",
            "To listen to the Mountain's story.",
            "To unlock the Library of Echoes.",
            "To find the path that only the wise know."
        ],
        challenges: [
            "Listening quietly to hear the whispers of history.",
            "Waiting patiently for the 'Time Turtle'.",
            "Understanding a riddle spoken in an old language.",
            "Showing respect to the Guardian of the Gate.",
            "Helping an elder creature cross the River of Time."
        ]
    },
    'val-teamwork': {
        heritageContext: "The Bond of the Tribe and the Pearl Divers.",
        visualStyle: "Coastal blues, nautical ropes, sparkling pearl finishes.",
        goals: [
            "To combine powers to unlock the Magic Gate.",
            "To sail the 'Double-Deck' ship across the sky.",
            "To balance the Great Scales of Harmony.",
            "To solve the Puzzle of Two Minds.",
            "To build a bridge that meets in the middle."
        ],
        challenges: [
            "Realizing that two magic wands are stronger than one.",
            "Learning to row in the same direction.",
            "Sharing the captain's hat.",
            "Listening to each other's ideas.",
            "The 'Echo Canyon' where you must speak as one."
        ]
    },
    'val-bravery': {
        heritageContext: "The Bravery of the Desert Knight.",
        visualStyle: "Pristine whites, tech-futurism mixed with soft nursery colors.",
        goals: [
            "To defeat the 'Shadow Spots' on the Crystal Shield.",
            "To polish the Pearl of Brightness.",
            "To visit the Healer of Gems.",
            "To stand guard at the White Castle.",
            "To uncover the smile of the Stone Statue."
        ],
        challenges: [
            "Standing still while the 'Healing Wizard' works.",
            "The 'Buzzing Bee' sound of the polisher.",
            "Keeping the mouth open like a hippo.",
            "The bright light of the Truth Sun.",
            "Trusting the Healer's gentle hand."
        ]
    },
    'val-honesty': {
        heritageContext: "The Clarity of the Oasis Spring.",
        visualStyle: "Crystal clear water reflections, bright sunbeams, lush palm greenery.",
        goals: [
            "To see one's true reflection in the Sacred Pool.",
            "To find the clear crystal that never fogs.",
            "To speak the password that opens the Glass Door.",
            "To return the 'Jewel of Trust' to its pedestal.",
            "To wash away the 'Grey Paint' of a lie."
        ],
        challenges: [
            "The 'Fog of Little Lies' that hides the path.",
            "The heavy weight of a secret in the pocket.",
            "Admitting a mistake to the Guardian.",
            "The fear that the truth might hurt.",
            "The tempting 'Short-Cut' that leads nowhere."
        ]
    },
    'val-helping': {
        heritageContext: "Planting the Ghaf Tree (The National Tree of Giving).",
        visualStyle: "Earthy tones, detailed Ghaf leaf textures, warm communal energy.",
        goals: [
            "To bring gathered light to the Dark Valley.",
            "To water the thirsty flowers of the Wasteland.",
            "To fix the broken wing of the Wind-Bird.",
            "To build a shelter for the Rain-Sprites.",
            "To share the 'Bread of Life' with the hungry."
        ],
        challenges: [
            "The basket of light is heavy and the path is long.",
            "The sun is hot and the water is scarce.",
            "Giving up play-time to help another.",
            "Getting muddy hands to do good work.",
            "The 'Selfish Stone' that blocks the way."
        ]
    },
    'val-tidy': {
        heritageContext: "Protecting the Beauty of our Land.",
        visualStyle: "Clean geometric compositions, soft pastel 'organized' spaces.",
        goals: [
            "To banish the 'Chaos Gremlins' from the castle.",
            "To sort the treasures of the Dragon's Cave.",
            "To align the books in the Infinite Library.",
            "To clear the path for the King's Parade.",
            "To find the lost Crown hidden in the mess."
        ],
        challenges: [
            "Finding the rightful place for every magical artifact.",
            "The 'Dust Bunnies' that multiply when you look away.",
            "The distraction of finding old toys.",
            "The 'Lazy Fog' that makes you want to stop.",
            "Deciding what to keep and what to give away."
        ]
    },
    'val-sharing-toys': {
        heritageContext: "The Tradition of the Shared Plate (Karam).",
        visualStyle: "Warm candlelight, rich textile patterns (Sadu), generous portions.",
        goals: [
            "To host a feast where the food never runs out.",
            "To divide the Golden Apple so everyone gets a piece.",
            "To let the 'Guest Knight' ride the favorite horse.",
            "To open the 'Play-Chest' for the whole village.",
            "To trade treasures in the Market of Joy."
        ],
        challenges: [
            "The fear that sharing means having less.",
            "Wanting the shiniest gem for oneself.",
            "The 'Mine-Mine Bird' squawking in the ear.",
            "Seeing someone else play with your favorite wand.",
            "Understanding that shared joy is double joy."
        ]
    },
    'val-school': {
        heritageContext: "The House of Wisdom (Bayt al-Hikmah).",
        visualStyle: "Floating books, magical chalk dust, owl motifs, starlit libraries.",
        goals: [
            "To pass the entrance exam for the 'Sky Academy'.",
            "To learn the 'Spell of Curiosity'.",
            "To make friends with the Class Dragon.",
            "To find the 'Library of All Answers'.",
            "To earn the badge of the 'Smart Explorer'."
        ],
        challenges: [
            "The 'Butterfly of Distraction'.",
            "Afraid to raise a hand to ask the Giant Owl a question.",
            "The backpack feels heavy with new books.",
            "Getting lost in the Hall of Hallways.",
            "Missing the comfort of home."
        ]
    },
    'val-potty': {
        heritageContext: "The Rite of Passage to Growing Up.",
        visualStyle: "Gold and royal blue, sparkle effects, trumpets, clean white marble.",
        goals: [
            "To become the King/Queen of the 'Golden Throne'.",
            "To say goodbye to the 'Diaper Kingdom'.",
            "To earn the 'Underwear of Big Kids'.",
            "To defeat the 'Wetness Wizard'.",
            "To master the 'Flush Button' power."
        ],
        challenges: [
            "Listening to the body's secret signal.",
            "Stopping play-time to run to the castle.",
            "Waiting too long to start the journey.",
            "The fear of the flushing sound.",
            "Sitting still on the high seat."
        ]
    },

    // --- ADVENTURES ---
    'adv-lost-found': {
        heritageContext: "Falconry (Al Miqnas) and the Singing Dunes.",
        visualStyle: "Wide-angle desert vistas, soaring falcon silhouettes, orange/teal contrast.",
        goals: [
            "To find the lost Heart of the Island.",
            "To return the Baby Star to the sky.",
            "To locate the missing key to the Secret Garden.",
            "To find the compass that points to tomorrow.",
            "To recover the stolen voice of the Songbird."
        ],
        challenges: [
            "The clues are hidden in riddles by the Trickster Fox.",
            "The path keeps shifting like a sand dune.",
            "The wind blows the tracks away.",
            "The item is guarded by a sleepy Dragon.",
            "Looking in the dark without a lantern."
        ]
    },
    'adv-mini-nature': {
        heritageContext: "The Hidden Aflaj in a Palm Grove.",
        visualStyle: "Dappled sunlight through palm leaves, sparkling water, vibrant dragonflies.",
        goals: [
            "To discover a creature no one has ever seen.",
            "To find the flower that blooms only once a year.",
            "To collect a dewdrop from the Giant Leaf.",
            "To follow the trail of the Golden Ant.",
            "To meet the Spirit of the Palm Tree."
        ],
        challenges: [
            "Being quiet enough to not scare the whispers away.",
            "The tall grass is a maze of green.",
            "The sun is setting fast.",
            "Crossing the 'Great Puddle Ocean'.",
            "Not stepping on the tiny houses of the bugs."
        ]
    },
    'adv-city': {
        heritageContext: "The Sensory Magic of the Old Souq.",
        visualStyle: "Crimson saffron piles, glowing lanterns, bustling market energy.",
        goals: [
            "To find the secret 'Magic Shop' hidden in the city.",
            "To catch the 'Ghost Bus' that goes to the moon.",
            "To gather all the ingredients for the Ultimate Feast.",
            "To deliver the Mayor's lost hat.",
            "To find the street that isn't on the map."
        ],
        challenges: [
            "The city streets keep changing like a maze.",
            "The traffic lights turn into robots.",
            "Navigating the crowd of busy giants.",
            "The 'Impulse Buy' shop that traps you with toys.",
            "The noise of the city drowns out the clues."
        ]
    },
    'adv-animal': {
        heritageContext: "The Mystery of the Arabian Oryx.",
        visualStyle: "Ethereal moonlight, silvery Oryx coats, glowing desert flora.",
        goals: [
            "To learn the song of the Great Rain.",
            "To become an honorary member of the Wolf Pack.",
            "To deliver a message to the Wise Lion King.",
            "To help the Elephant remember a forgotten memory.",
            "To race the Cheetah to the edge of the world."
        ],
        challenges: [
            "The animals only speak in riddles.",
            "Walking softly on the crunchiest leaves.",
            "The River of Roars is hard to cross.",
            "The fear of the sharp teeth.",
            "Keeping up with the fast herd."
        ]
    },
    'adv-magic': {
        heritageContext: "1001 Nights & The Flying Carpet.",
        visualStyle: "High-altitude views, intricate carpet fringes, wind-blown hair.",
        goals: [
            "To master the unruly 'Flying Carpet'.",
            "To learn the spell that fixes broken toys.",
            "To fly to the City of Clouds.",
            "To capture a jar of starlight.",
            "To open the jar of Genie Wind."
        ],
        challenges: [
            "The item has a mind of its own!",
            "The magic words are hard to pronounce.",
            "Controlling the flight during a storm.",
            "The magic fades if you stop believing.",
            "The object tries to return to its master."
        ]
    },
    'adv-fantasy': {
        heritageContext: "The Legend of the Sea Djinn.",
        visualStyle: "Bioluminescent corals, turquoise water, shimmering scales.",
        goals: [
            "To defend the Pillow Fort from invisible dragons.",
            "To sail the Bed-Boat to the edge of the rug.",
            "To climb the Bookshelf Mountain.",
            "To rescue the Princess/Prince from the Tower.",
            "To map the uncharted lands of 'Under-Bed'."
        ],
        challenges: [
            "The floor is made of molten lava!",
            "The closet door is opening...",
            "The 'Shadows' look scary in the dark.",
            "Running out of imagination fuel.",
            "The fort walls are crumbling."
        ]
    },
    'adv-treasure': {
        heritageContext: "The Lost City of Ubar.",
        visualStyle: "Red sandstone textures, ancient carvings, dusty sunbeams.",
        goals: [
            "To find the chest that holds 'The Greatest Joy'.",
            "To dig up the pirate's forgotten snack stash.",
            "To solve the riddle of the Golden Skull.",
            "To find the key that opens the Moon.",
            "To claim the title of 'Captain Curiosity'."
        ],
        challenges: [
            "Reading the faded map of the Ancients.",
            "The parrot keeps giving wrong directions.",
            "Digging in the hard, hot sand.",
            "Avoiding the 'Trap of Tickles'.",
            "Sharing the treasure with the crew."
        ]
    },
    'adv-dino': {
        heritageContext: "Prehistoric Arabia.",
        visualStyle: "Deep jungle greens, massive scale contrasts, prehistoric mist.",
        goals: [
            "To walk with the Giants of old.",
            "To save the Dino-Egg from the volcano.",
            "To find the 'Leaf of Healing' for the T-Rex.",
            "To learn how to roar like a King.",
            "To hide from the meteor shower."
        ],
        challenges: [
            "Not getting stepped on by a clumsy Brachiosaurus.",
            "The roars are very loud!",
            "The ground shakes when they dance.",
            "Finding food in a strange land.",
            "The volcano is starting to smoke."
        ]
    },
    'adv-space': {
        heritageContext: "The Hope Probe & Mars Mission.",
        visualStyle: "Cosmic purples, high-tech suits, the blue marble of Earth.",
        goals: [
            "To find a new home for the Star-Plant.",
            "To race a comet around the rings of Saturn.",
            "To plant the flag of Friendship on Mars.",
            "To fix the satellite that broadcasts lullabies.",
            "To meet the Man in the Moon."
        ],
        challenges: [
            "Dodging the Asteroid Belt of Bumps.",
            "Zero gravity makes floating tricky.",
            "The rocket needs 'Imagination Fuel'.",
            "It's very quiet and lonely in space.",
            "The alien language is hard to understand."
        ]
    },
    'adv-pyramid': {
        heritageContext: "The Rock Tombs of Hegra.",
        visualStyle: "Dramatic lighting, ultra-detailed rock, cinematic scope.",
        goals: [
            "To open the Door of Sands.",
            "To wake the Sleeping Sphinx.",
            "To find the scroll of Ancient Jokes.",
            "To return the Mummy's cat.",
            "To light the torch of the Deep Tomb."
        ],
        challenges: [
            "Answering the Sphinx's three questions.",
            "The torch keeps flickering out.",
            "The maze of the pyramid shifts.",
            "Deciphering hieroglyphs.",
            "The scarab beetles tickle your feet."
        ]
    },
    'adv-cooking': {
        heritageContext: "The Royal Kitchens of the Sultan.",
        visualStyle: "Flour clouds, colorful ingredients, warm oven glow, copper pots.",
        goals: [
            "To bake the 'Giant Cake of Happiness'.",
            "To find the secret ingredient for the Royal Soup.",
            "To cook a feast for the hungry Forest Giants.",
            "To open a restaurant that serves starlight.",
            "To win the Golden Spoon in the Great Cook-off."
        ],
        challenges: [
            "The dough keeps growing and growing!",
            "The recipe is written in invisible ink.",
            "The naughty 'Salt Sprites' trying to ruin the taste.",
            "The oven is a grumpy dragon mouth.",
            "The ingredients keep running away."
        ]
    }
};

export function getGuidelineForTheme(storyData: StoryData): string {
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

    const goal = storyData.customGoal || themeContent.goals[0];
    const challenge = storyData.customChallenge || themeContent.challenges[0];

    let contextLock = "";
    if (themeId) {
        const parts = themeId.split('-');
        const category = parts[0];
        const name = parts[1];
        contextLock = `STRICT SETTING LOCK: This is a ${category} story specifically about ${name}. Do NOT use generic 'backyards' or 'gardens' unless that is the Heritage Context below.\n`;
    }

    return `${contextLock}
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
