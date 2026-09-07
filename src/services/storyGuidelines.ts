import type { StoryData } from '@/types';

export interface AgeTaggedItem {
  text: string;
  ageBand?: string[]; // e.g. ["1-3", "4-5", "6-8", "9-12"]
}

export type ThemeItem = string | AgeTaggedItem;

export interface ThemeContent {
  heritageContext: string;
  visualStyle: string;
  minAgeRecommended?: number;
  maxAgeRecommended?: number;
  homeBaseSuggestion?: string;
  anchorObject?: string;
  anchorTriggerRule?: string;
  companionGuide?: string;
  returnBridgeHint?: string;
  moralPayoffPhrase?: string;
  soundWordPalette?: string[];
  contentWatchlist?: string[];
  goals: ThemeItem[];
  challenges: ThemeItem[];
}

const themeLibrary: Record<string, ThemeContent> = {
  'val-siblings': {
    heritageContext: "The Joy of the Growing Family & Welcoming the Little One.",
    visualStyle: "Soft pastel nursery tones, wooden baby cradle, cozy knitted blankets, gentle morning light.",
    minAgeRecommended: 2,
    homeBaseSuggestion: "A cozy family living room rug with colorful building blocks and a soft baby crib nearby.",
    anchorObject: "A soft chiming baby rattle with a smiling moon.",
    anchorTriggerRule: "Chimes with sweet melody when speaking in gentle loving tones, stays quiet when resting.",
    companionGuide: "A cheerful little songbird that perches near the cradle.",
    returnBridgeHint: "Snuggling close together on the sofa as Mama, Papa, Big Hero, and Baby share a peaceful bedtime story.",
    moralPayoffPhrase: "Being a big brother or sister is the sweetest superpower—love grows bigger with every hug.",
    soundWordPalette: ["GIGGLE!", "COO-COO", "CHIME-CHIME", "SHHH...", "PITTER-PATTER"],
    goals: [
      { text: "To be the 'Super Big Helper' who brings the baby's soft star blanket.", ageBand: ["1-3", "4-5"] },
      { text: "To sing a gentle bedtime song that helps the baby stop crying and fall asleep.", ageBand: ["1-3", "4-5"] },
      { text: "To show the new baby the favorite picture book and explain the pictures.", ageBand: ["1-3", "4-5"] },
      { text: "To build the great 'Welcome Castle' out of cushions and blocks for the baby.", ageBand: ["4-5", "6-8"] },
      { text: "To lead the younger sibling on their very first mini-expedition in the garden.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Speaking in soft, gentle whisper-voices while the baby takes a nap.", ageBand: ["1-3", "4-5"] },
      { text: "Waiting patiently while Mama and Papa feed and burp the baby.", ageBand: ["1-3", "4-5"] },
      { text: "Sharing the favorite wooden toys and space on the playroom rug.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "Understanding that a baby communicates by crying rather than words.", ageBand: ["4-5", "6-8"] },
      { text: "Learning that love in a family multiplies and never runs out.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-dentist': {
    heritageContext: "The Shining Smile of the Brave Little Knight.",
    visualStyle: "Sparkling mint greens, gleaming pearly whites, gentle crystal lighting, bubbly fresh water.",
    maxAgeRecommended: 6,
    homeBaseSuggestion: "A sunny bathroom sink with a favorite colorful toothbrush and a step-stool.",
    anchorObject: "A magical shining tooth-star mirror.",
    anchorTriggerRule: "Glows with bright diamond sparkles when taking a brave breath and smiling wide.",
    companionGuide: "A friendly dental fairy turtle wearing tiny shiny goggles.",
    returnBridgeHint: "Skipping proudly out of Dr. Smile's office with a glowing sticker and a bright sparkling smile.",
    moralPayoffPhrase: "Taking care of our smile is how we shine our brightest light into the world.",
    soundWordPalette: ["SPARKLE!", "BUZZ-BUZZ", "SWISH-SWISH", "DING!", "TA-DA!"],
    goals: [
      { text: "To ride the 'Rocket Elevator Chair' up high and count all the shining pearls.", ageBand: ["1-3", "4-5"] },
      { text: "To polish the teeth with the magic strawberry foam.", ageBand: ["1-3", "4-5"] },
      { text: "To show Dr. Smile how big and wide a friendly hero can open their mouth.", ageBand: ["1-3", "4-5"] },
      { text: "To defeat the 'Sugar Bugs' hiding between the back molars.", ageBand: ["4-5", "6-8"] },
      { text: "To earn the Gold Medal of the Healthy Shining Smile.", ageBand: ["4-5", "6-8"] }
    ],
    challenges: [
      { text: "Opening the mouth wide like a friendly hippo while Dr. Smile looks with the tiny mirror.", ageBand: ["1-3", "4-5"] },
      { text: "The funny buzzing tickle sound of the electric water polisher.", ageBand: ["1-3", "4-5"] },
      { text: "Sitting still and holding hands while the friendly doctor checks every tooth.", ageBand: ["1-3", "4-5"] },
      { text: "Overcoming the butterfly flutter in the tummy before sitting in the chair.", ageBand: ["4-5", "6-8"] },
      { text: "Remembering to brush in gentle circles every single morning and night.", ageBand: ["4-5", "6-8"] }
    ]
  },
  'adv-daily': {
    heritageContext: "Finding Magic in Everyday Routines.",
    visualStyle: "Sunny morning kitchen, towers of cereal boxes, colorful supermarket aisles, bright daylight.",
    homeBaseSuggestion: "A sunny kitchen counter with a toy apron, mixing bowl, and breakfast table.",
    anchorObject: "A magical morning stopwatch badge.",
    anchorTriggerRule: "Spins with rainbow light when finishing daily quests before the bell.",
    companionGuide: "A cheerful alarm-clock pup that wags its tail on time.",
    returnBridgeHint: "Sitting down at the table after a victorious morning with a warm breakfast plate.",
    moralPayoffPhrase: "Every single day holds a secret adventure when we bring imagination to what we do.",
    soundWordPalette: ["TICK-TOCK!", "CRUNCH!", "POOF!", "SWOOSH!", "DING-DONG!"],
    goals: [
      { text: "To turn getting dressed in the morning into a superhero cape challenge.", ageBand: ["1-3", "4-5"] },
      { text: "To navigate the supermarket aisle and find the golden cereal box.", ageBand: ["1-3", "4-5"] },
      { text: "To help bake the world's most delicious pancake mountain with fresh berries.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "To solve the mystery of the missing front door keys before school.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To turn the weekend chore list into a pirate treasure map.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Getting the shoes onto the right feet before the countdown finishes.", ageBand: ["1-3", "4-5"] },
      { text: "Not eating the chocolate chips before they go into the pancake batter.", ageBand: ["1-3", "4-5"] },
      { text: "The melting ice cream in the grocery cart that must reach home safely.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "Staying focused on the quest without getting distracted by toys along the way.", ageBand: ["4-5", "6-8"] },
      { text: "Working quickly and carefully to beat the morning clock.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-magic-obj': {
    heritageContext: "The Sorcerer's Oasis and Enchanted Artifacts.",
    visualStyle: "Luminescent particles, floating carpets, starry robes, glowing ancient runes.",
    homeBaseSuggestion: "A play corner draped with silk scarves and starry fairy lights.",
    anchorObject: "A pocket wand of spun starlight.",
    anchorTriggerRule: "Sparks with violet stars when waving in a circle with belief.",
    companionGuide: "A floating friendly spell-book with fluttering pages.",
    returnBridgeHint: "Floating gently on a starry cloud right back onto the bedroom rug.",
    moralPayoffPhrase: "True magic is not in the object—it is in the kindness of our heart.",
    soundWordPalette: ["SPARKLE!", "POOF!", "SHIMMER...", "ZAP!", "WHOOSH!"],
    goals: [
      { text: "To brew the 'Potion of Everlasting Giggles'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the wand that only works when you say please.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To teach the flying carpet how to land softly.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To wake up the Sleeping Spell-Book.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To rescue the Star-Dust from the Magic Jar.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "The wand has a tickle-curse on it.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The magic words are backward.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The carpet is afraid of heights.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The potion needs one last rare smile.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Spells bouncing off mirror walls.", ageBand: ["6-8", "9-12"] }
    ]
  },
  // --- VALUES ---
  'val-sleep': {
    heritageContext: "The Vast Arabian Night & Bedouin Hospitality.",
    visualStyle: "Indigo/gold palette, Mashrabiya patterns, glowing crescent moon.",
    homeBaseSuggestion: "A cozy bedroom corner with soft rugs and starlight through the window.",
    anchorObject: "A glowing crescent night-stone.",
    anchorTriggerRule: "Glows warm and bright when feeling sleepy and calm, grows cool and dim when tossing and turning.",
    companionGuide: "A gentle glowing moth who whispers sweet bedtime secrets.",
    returnBridgeHint: "Snuggling softly under the warm quilt as the starlight wraps everything in peaceful dreams.",
    moralPayoffPhrase: "Sleep is the magical doorway where new adventures rest until morning.",
    soundWordPalette: ["SHHH...", "YAAAWN...", "TINKLE...", "FLUTTER...", "SOFT-STEP"],
    goals: [
      { text: "To prepare for the great Dream Festival.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To recharge magic powers for tomorrow.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To catch the falling stars before they fade.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To find the softest cloud for the Moon to rest on.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To visit the Castle of Sleep.", ageBand: ["1-3", "4-5", "6-8", "9-12"] }
    ],
    challenges: [
      { text: "The 'Noisy Giggles' keeping everyone awake.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The Tickle-Monster lurking under the bed.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The bright lights of the Firefly Parade.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "A lost lullaby that needs to be sung.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The excitement of tomorrow's big race.", ageBand: ["4-5", "6-8", "9-12"] }
    ]
  },
  'val-respect': {
    heritageContext: "The Majlis and the Wisdom of Roots.",
    visualStyle: "Cedar wood textures, Zellige tiles, golden Dallah (coffee pots).",
    homeBaseSuggestion: "A sunny wooden porch with woven mats and a storybook.",
    anchorObject: "A polished wooden compass stone.",
    anchorTriggerRule: "Glows with quiet light when listening carefully, stays quiet when hurrying.",
    companionGuide: "A wise hoopoe bird with a crown of feathers.",
    returnBridgeHint: "Walking slowly back to the warm Majlis with a heart full of respect.",
    moralPayoffPhrase: "When we listen with gentle ears, the oldest trees share their sweetest secrets.",
    soundWordPalette: ["TAP-TAP", "RUSTLE...", "COO-COO", "CREAK...", "WHISPER..."],
    goals: [
      { text: "To listen to the Mountain's quiet story.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To help the Ancient Living Tree find water.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To learn the secret of the 'Oldest Star'.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To unlock the Library of Echoes.", ageBand: ["6-8", "9-12"] },
      { text: "To find the path that only the wise know.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Listening quietly to hear the whispers of history.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Waiting patiently for the 'Time Turtle'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Helping an elder creature cross the River of Time.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Showing respect to the Guardian of the Gate.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Understanding a riddle spoken in an old language.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-teamwork': {
    heritageContext: "The Bond of the Tribe and the Pearl Divers.",
    visualStyle: "Coastal blues, nautical ropes, sparkling pearl finishes.",
    homeBaseSuggestion: "A breezy seaside balcony with seashells on a wooden table.",
    anchorObject: "A dual-shimmering sea shell.",
    anchorTriggerRule: "Glows bright blue when working together, dims when pulling in opposite directions.",
    companionGuide: "A cheerful baby sea turtle with flippers eager to paddle.",
    returnBridgeHint: "Paddling the boat together back to the sandy shore under the warm sun.",
    moralPayoffPhrase: "Two little hands together can build what one hand cannot lift.",
    soundWordPalette: ["SPLASH!", "HEAVE-HO!", "SWISH-SWISH", "CLICK!", "ZOOM!"],
    goals: [
      { text: "To carry the Big Basket together, one on each side.", ageBand: ["1-3", "4-5"] },
      { text: "To build a bridge that meets in the middle.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To combine powers to unlock the Magic Gate.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To sail the 'Double-Deck' ship across the sky.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To solve the Puzzle of Two Minds.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Learning to row in the same direction.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Sharing the captain's hat.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Realizing that two magic wands are stronger than one.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Listening to each other's ideas.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The 'Echo Canyon' where you must speak as one.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-bravery': {
    heritageContext: "The Bravery of the Desert Knight.",
    visualStyle: "Pristine whites, tech-futurism mixed with soft nursery colors.",
    homeBaseSuggestion: "A cozy playroom with a play shield and colorful building blocks.",
    anchorObject: "A gleaming brave-heart crystal badge.",
    anchorTriggerRule: "Glows with courage when taking a deep breath, stays steady when standing tall.",
    companionGuide: "A friendly baby falcon who claps its wings with cheer.",
    returnBridgeHint: "Skipping proudly back home with a shining smile.",
    moralPayoffPhrase: "Being brave doesn't mean never feeling afraid—it means taking one small step anyway.",
    soundWordPalette: ["BEEP-BEEP", "PING!", "BUZZ-BUZZ", "TA-DA!", "SWOOSH!"],
    goals: [
      { text: "To visit the Healer of Gems.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To polish the Pearl of Brightness.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To defeat the 'Shadow Spots' on the Crystal Shield.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To stand guard at the White Castle.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To uncover the smile of the Stone Statue.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Standing still while the 'Healing Wizard' works.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The 'Buzzing Bee' sound of the polisher.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Keeping the mouth open like a hippo.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Trusting the Healer's gentle hand.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The bright light of the Truth Sun.", ageBand: ["4-5", "6-8", "9-12"] }
    ]
  },
  'val-honesty': {
    heritageContext: "The Clarity of the Oasis Spring.",
    visualStyle: "Crystal clear water reflections, bright sunbeams, lush palm greenery.",
    minAgeRecommended: 3,
    homeBaseSuggestion: "A bright garden corner by a clear water fountain.",
    anchorObject: "A clear water crystal that reflects clean light.",
    anchorTriggerRule: "Shines crystal clear when speaking the true words, fogs up when hiding a mistake.",
    companionGuide: "A gentle green frog who hops closer whenever the truth is spoken.",
    returnBridgeHint: "Walking back to the sunny garden with a light, happy heart.",
    moralPayoffPhrase: "Speaking the truth is like clean water—it washes away every worry.",
    soundWordPalette: ["PLOP!", "SPLASH!", "GLOW...", "PING!", "HOP-HOP!"],
    goals: [
      { text: "To bring back the toy that got mixed up with someone else's.", ageBand: ["1-3", "4-5"] },
      { text: "To speak the password that opens the Glass Door.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To return the 'Jewel of Trust' to its pedestal.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To wash away the 'Grey Paint' of a lie.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To see one's true reflection in the Sacred Pool.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Admitting a mistake to the Guardian.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The fear that the truth might hurt.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The heavy weight of a secret in the pocket.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The 'Fog of Little Lies' that hides the path.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The tempting 'Short-Cut' that leads nowhere.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-helping': {
    heritageContext: "Planting the Ghaf Tree (The National Tree of Giving).",
    visualStyle: "Earthy tones, detailed Ghaf leaf textures, warm communal energy.",
    homeBaseSuggestion: "A garden plot with a small watering can and blooming seeds.",
    anchorObject: "A little green watering bell.",
    anchorTriggerRule: "Rings with cheerful music whenever helping a friend in need.",
    companionGuide: "A busy little honeybee with soft fuzzy wings.",
    returnBridgeHint: "Skipping back to the green garden under the shade of the grand Ghaf tree.",
    moralPayoffPhrase: "A helping hand makes the whole world blossom into a garden.",
    soundWordPalette: ["BUZZ-BUZZ", "PITTER-PATTER", "DRIP-DROP", "TING-TING", "WHOOSH!"],
    goals: [
      { text: "To water the thirsty flowers of the garden.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To bring gathered light to the Dark Valley.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To fix the broken wing of the Wind-Bird.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To build a shelter for the Rain-Sprites.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To share the 'Bread of Life' with the hungry.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Giving up play-time to help another.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Getting muddy hands to do good work.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The basket of light is heavy and the path is long.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The sun is hot and the water is scarce.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The 'Selfish Stone' that blocks the way.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-tidy': {
    heritageContext: "Protecting the Beauty of our Land.",
    visualStyle: "Clean geometric compositions, soft pastel 'organized' spaces.",
    homeBaseSuggestion: "A playroom floor with toy boxes and colorful sorting bins.",
    anchorObject: "A magical sorting wand with a soft star tip.",
    anchorTriggerRule: "Glows bright rainbow colors when things find their true home.",
    companionGuide: "A tidy little robot kitten that purrs when rooms are neat.",
    returnBridgeHint: "Sitting happily in the clean, cozy room with everything in its place.",
    moralPayoffPhrase: "When every toy finds its home, our room has plenty of space for new adventures.",
    soundWordPalette: ["SWOOSH!", "CLICK-CLACK", "TOCK!", "ZIP!", "SPARKLE!"],
    goals: [
      { text: "To find the lost Crown hidden in the mess.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To sort the treasures into the right boxes.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To banish the 'Chaos Gremlins' from the castle.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To clear the path for the King's Parade.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To align the books in the Infinite Library.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Finding the rightful place for every magical toy.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The distraction of finding old forgotten toys.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The 'Dust Bunnies' that multiply when you look away.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The 'Lazy Fog' that makes you want to stop.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Deciding what to keep and what to give away.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-sharing-toys': {
    heritageContext: "The Tradition of the Shared Plate (Karam).",
    visualStyle: "Warm candlelight, rich textile patterns (Sadu), generous portions.",
    homeBaseSuggestion: "A woven living room rug with a shared wooden toy box.",
    anchorObject: "A warm carved wooden bowl that never empties.",
    anchorTriggerRule: "Fills with sweet fruit when shared, grows empty when kept away.",
    companionGuide: "A friendly gazelle calf who shares its sweet dates.",
    returnBridgeHint: "Sitting together with friends on the woven rug, smiling and sharing.",
    moralPayoffPhrase: "A toy shared with a friend brings double the joy and double the fun.",
    soundWordPalette: ["CRUNCH!", "YUM-YUM!", "CLAP-CLAP!", "GIGGLE...", "CHEER!"],
    goals: [
      { text: "To open the 'Play-Chest' for the whole village.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To divide the Saffron Apple so everyone gets a piece.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To let the 'Guest Knight' ride the favorite horse.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To host a feast where the food never runs out.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To trade treasures in the Market of Joy.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Seeing someone else play with your favorite wand.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The fear that sharing means having less.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The 'Mine-Mine Bird' squawking in the ear.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Wanting the shiniest gem for oneself.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Understanding that shared joy is double joy.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'val-school': {
    heritageContext: "The House of Wisdom (Bayt al-Hikmah).",
    visualStyle: "Floating books, magical chalk dust, owl motifs, starlit libraries.",
    maxAgeRecommended: 7,
    homeBaseSuggestion: "A cozy study desk with fresh crayons and a shiny new backpack.",
    anchorObject: "A magical glowing pencil that writes with starlight.",
    anchorTriggerRule: "Draws golden stars when asking curious questions.",
    companionGuide: "A wise little owl wearing round reading spectacles.",
    returnBridgeHint: "Walking cheerfully through the school gate back home with a backpack full of discoveries.",
    moralPayoffPhrase: "Every question is a golden key that opens a brand-new door of wonder.",
    soundWordPalette: ["SCRITCH-SCRATCH", "HOOT-HOOT!", "DING-DONG!", "FLIP-FLAP", "AHA!"],
    goals: [
      { text: "To make friends with the Class Dragon.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "To earn the badge of the 'Smart Explorer'.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "To learn the 'Spell of Curiosity'.", ageBand: ["4-5", "6-8"] },
      { text: "To pass the entrance exam for the 'Sky Academy'.", ageBand: ["4-5", "6-8"] },
      { text: "To find the 'Library of All Answers'.", ageBand: ["6-8"] }
    ],
    challenges: [
      { text: "Afraid to raise a hand to ask the Giant Owl a question.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "The backpack feels heavy with new books.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "Missing the comfort of home.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "The 'Butterfly of Distraction'.", ageBand: ["4-5", "6-8"] },
      { text: "Getting lost in the Hall of Hallways.", ageBand: ["6-8"] }
    ]
  },
  'val-potty': {
    heritageContext: "The Rite of Passage to Growing Up.",
    visualStyle: "Gold and royal blue, sparkle effects, trumpets, clean white marble.",
    maxAgeRecommended: 4,
    homeBaseSuggestion: "A sparkling bathroom castle with a royal step-stool.",
    anchorObject: "A golden crown button badge.",
    anchorTriggerRule: "Plays triumphant fanfare music when stopping play on time.",
    companionGuide: "A royal teddy bear that cheers and claps.",
    returnBridgeHint: "Marching proudly back to the playroom wearing big-kid underpants.",
    moralPayoffPhrase: "Listening to our body's quiet whisper makes us a true king and queen of growing up.",
    soundWordPalette: ["FLUSH!", "SWOOSH!", "TRUMPET-FANFARE!", "TA-DA!", "PHEW..."],
    goals: [
      { text: "To become the King/Queen of the 'Golden Throne'.", ageBand: ["1-3", "4-5"] },
      { text: "To say goodbye to the 'Diaper Kingdom'.", ageBand: ["1-3", "4-5"] },
      { text: "To earn the 'Underwear of Big Kids'.", ageBand: ["1-3", "4-5"] },
      { text: "To master the 'Flush Button' power.", ageBand: ["1-3", "4-5"] },
      { text: "To defeat the 'Wetness Wizard'.", ageBand: ["1-3", "4-5"] }
    ],
    challenges: [
      { text: "Listening to the body's secret signal.", ageBand: ["1-3", "4-5"] },
      { text: "Stopping play-time to run to the castle.", ageBand: ["1-3", "4-5"] },
      { text: "Waiting too long to start the journey.", ageBand: ["1-3", "4-5"] },
      { text: "The fear of the flushing sound.", ageBand: ["1-3", "4-5"] },
      { text: "Sitting still on the high seat.", ageBand: ["1-3", "4-5"] }
    ]
  },

  // --- ADVENTURES ---
  'adv-lost-found': {
    heritageContext: "Falconry (Al Miqnas) and the Singing Dunes.",
    visualStyle: "Wide-angle desert vistas, soaring falcon silhouettes, orange/teal contrast.",
    homeBaseSuggestion: "A desert tent porch with binoculars and a compass.",
    anchorObject: "A silver falcon feather charm.",
    anchorTriggerRule: "Glows with a warm breeze pointing toward the lost treasure.",
    companionGuide: "A sharp-eyed baby falcon that swoops to guide the way.",
    returnBridgeHint: "Riding the soft singing dunes back to the family camp.",
    moralPayoffPhrase: "Nothing truly special is ever lost when we look with patience and love.",
    soundWordPalette: ["SCREEECH!", "SWOOSH!", "WHIRL...", "CLICK!", "AHA!"],
    goals: [
      { text: "To return the Baby Star to the sky.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To locate the missing key to the Secret Garden.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the lost Heart of the Island.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To find the compass that points to tomorrow.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To recover the stolen voice of the Songbird.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "The wind blows the tracks away.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Looking in the dark without a lantern.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The path keeps shifting like a sand dune.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The clues are hidden in riddles by the Trickster Fox.", ageBand: ["6-8", "9-12"] },
      { text: "The item is guarded by a sleepy Dragon.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-mini-nature': {
    heritageContext: "The Hidden Aflaj in a Palm Grove.",
    visualStyle: "Dappled sunlight through palm leaves, sparkling water, vibrant dragonflies.",
    homeBaseSuggestion: "A grassy garden path next to a clear stone water stream.",
    anchorObject: "A dewdrop magnifying glass.",
    anchorTriggerRule: "Reveals hidden tiny footprints when looking very closely.",
    companionGuide: "A bright green dragonfly with shimmering wings.",
    returnBridgeHint: "Stepping lightly across the stepping stones back to the garden gate.",
    moralPayoffPhrase: "The smallest tiny creatures in nature have the biggest wonders to share.",
    soundWordPalette: ["BUZZ-BUZZ", "SPLASH!", "CRUNCH-CRUNCH", "CHIRP-CHIRP", "RUSTLE..."],
    goals: [
      { text: "To meet the Spirit of the Palm Tree.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To collect a dewdrop from the Giant Leaf.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To follow the trail of the Amber Ant.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the flower that blooms only once a year.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To discover a creature no one has ever seen.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Being quiet enough to not scare the whispers away.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Crossing the 'Great Puddle Ocean'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Not stepping on the tiny houses of the bugs.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The tall grass is a maze of green.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The sun is setting fast.", ageBand: ["4-5", "6-8", "9-12"] }
    ]
  },
  'adv-city': {
    heritageContext: "The Sensory Magic of the Old Souq.",
    visualStyle: "Crimson saffron piles, glowing lanterns, bustling market energy.",
    homeBaseSuggestion: "A colorful play market stall with toy spices and felt lanterns.",
    anchorObject: "A miniature glowing brass lantern.",
    anchorTriggerRule: "Illuminates hidden alleyway signs when pointed forward.",
    companionGuide: "A clever alley cat with white paws that knows every roof.",
    returnBridgeHint: "Following the fragrant scent of roasted nuts back to the family market shop.",
    moralPayoffPhrase: "In the busiest city, the best treasure is finding our own way home.",
    soundWordPalette: ["CLINK-CLANK", "HONK-HONK!", "MEOW!", "DING-DING", "WHOOSH!"],
    goals: [
      { text: "To deliver the Mayor's lost hat.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the secret 'Magic Shop' hidden in the city.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To gather all the ingredients for the Ultimate Feast.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To catch the 'Ghost Bus' that goes to the moon.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To find the street that isn't on the map.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "The noise of the city drowns out the clues.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Navigating the crowd of busy giants.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The Shiny-Toy Trap that never lets you leave.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The city streets keep changing like a maze.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The traffic lights turn into robots.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-animal': {
    heritageContext: "The Mystery of the Arabian Oryx and desert wildlife.",
    visualStyle: "Ethereal moonlight, silvery Oryx coats, glowing desert flora.",
    homeBaseSuggestion: "A cozy desert play spot with a soft toy fawn and a warm blanket.",
    anchorObject: "A smooth glowing desert pebble.",
    anchorTriggerRule: "Glows warm and bright when calm and happy, cools when worried.",
    companionGuide: "A fennec fox kit with big curious ears.",
    returnBridgeHint: "Carrying the sleepy new friend gently back to the cozy play spot.",
    moralPayoffPhrase: "Listening with stillness is how we understand the quiet language of nature.",
    soundWordPalette: ["WHIMPER...", "SHHH...", "PITTER-PATTER", "SWOOSH!", "PURR..."],
    goals: [
      { text: "To learn the desert fox's quiet signals and earn its trust by listening and sitting very still.", ageBand: ["1-3", "4-5"] },
      { text: "To listen to what the animals need and carry fresh desert grass to the tired old Arabian horse.", ageBand: ["1-3", "4-5", "6-8"] },
      { text: "To understand the quiet language of desert animals and guide a lost baby oryx calf safely back to its herd.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To speak the gentle calming sounds that call back the escaped racing camel before the big race.", ageBand: ["6-8", "9-12"] },
      { text: "To understand the migratory bird's song and help it find the right direction on its long journey.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Earning the animal's trust requires stillness, patience, and listening with the whole heart.", ageBand: ["1-3", "4-5"] },
      { text: "Animals communicate through gentle sounds and body language rather than human words.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Understanding what a soft whimper or flick of the ears truly means.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Moving softly and slowly across the crunchy desert ground so the animal's quiet signals can be heard.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The desert is wide and the animal's soft calls are easy to miss in the wind.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-magic': {
    heritageContext: "The Sorcerer's Oasis.",
    visualStyle: "Luminescent particles, floating carpets, starry robes.",
    homeBaseSuggestion: "A play corner draped with silk scarves and starry fairy lights.",
    anchorObject: "A pocket wand of spun starlight.",
    anchorTriggerRule: "Sparks with violet stars when waving in a circle with belief.",
    companionGuide: "A floating friendly spell-book with fluttering pages.",
    returnBridgeHint: "Floating gently on a starry cloud right back onto the bedroom rug.",
    moralPayoffPhrase: "True magic is not in the wand—it is in the kindness of our heart.",
    soundWordPalette: ["SPARKLE!", "POOF!", "SHIMMER...", "ZAP!", "WHOOSH!"],
    goals: [
      { text: "To brew the 'Potion of Everlasting Giggles'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the wand that only works when you say please.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To teach the flying carpet how to land softly.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To wake up the Sleeping Spell-Book.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To rescue the Star-Dust from the Magic Jar.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "The wand has a tickle-curse on it.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The magic words are backward.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The carpet is afraid of heights.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The potion needs one last rare smile.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Spells bouncing off mirror walls.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-fantasy': {
    heritageContext: "The Realm of the Bed-Fort.",
    visualStyle: "Blanket mountains, pillow boulders, flashlight beam lanterns.",
    homeBaseSuggestion: "A grand blanket fort built with pillows and clothespins.",
    anchorObject: "A golden flashlight sceptre.",
    anchorTriggerRule: "Casts warm cozy light that melts away imaginary shadows.",
    companionGuide: "A brave plush dragon who guards the fort entrance.",
    returnBridgeHint: "Crawling through the cozy blanket tunnel right back under the bed covers.",
    moralPayoffPhrase: "With a little imagination, our bedroom becomes the greatest kingdom ever built.",
    soundWordPalette: ["ROAR!", "FLAP-FLAP", "CLICK!", "PITTER-PATTER", "GIGGLE!"],
    goals: [
      { text: "To sail the Bed-Boat to the edge of the rug.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To climb the Bookshelf Mountain.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To rescue the Princess/Prince from the Tower.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To map the uncharted lands of 'Under-Bed'.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To find the crown of the Blanket Castle.", ageBand: ["4-5", "6-8", "9-12"] }
    ],
    challenges: [
      { text: "The floor is made of molten lava!", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The fort walls are crumbling.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The closet door is opening...", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The 'Shadows' look scary in the dark.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Running out of imagination fuel.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-treasure': {
    heritageContext: "The Lost City of Ubar.",
    visualStyle: "Red sandstone textures, ancient carvings, dusty sunbeams.",
    contentWatchlist: ["No skulls, skeletons, or weapons — use golden scarabs, crystal keys, or locked chests instead."],
    homeBaseSuggestion: "A backyard sandbox with toy shovels and a pirate map.",
    anchorObject: "An ancient brass key charm.",
    anchorTriggerRule: "Glows with amber warmth when standing close to the hidden secret.",
    companionGuide: "A funny desert parrot that squawks helpful hints.",
    returnBridgeHint: "Walking proudly back from the dunes with the golden chest in hand.",
    moralPayoffPhrase: "The greatest treasure in the world is sharing an adventure with those we love.",
    soundWordPalette: ["CLINK!", "DIG-DIG", "SQUAWK!", "CREAK...", "AHA!"],
    goals: [
      { text: "To dig up the pirate's forgotten snack stash.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the chest that holds 'The Greatest Joy'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To claim the title of 'Captain Curiosity'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the key that opens the Moon.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To solve the riddle of the Golden Scarab.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Avoiding the 'Trap of Tickles'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The parrot keeps giving wrong directions.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Digging in the hard, hot sand.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Reading the faded map of the Ancients.", ageBand: ["6-8", "9-12"] },
      { text: "Sharing the treasure with the crew.", ageBand: ["4-5", "6-8", "9-12"] }
    ]
  },
  'adv-dino': {
    heritageContext: "Prehistoric Arabia.",
    visualStyle: "Deep jungle greens, massive scale contrasts, prehistoric mist.",
    contentWatchlist: ["No scary monster violence — emphasize friendly giants, roars of joy, and baby dino eggs."],
    homeBaseSuggestion: "A green garden lawn with toy dinosaurs and palm leaves.",
    anchorObject: "A fossilized amber egg pendant.",
    anchorTriggerRule: "Glows warm yellow when near a friendly dinosaur companion.",
    companionGuide: "A cheerful baby Triceratops with tiny friendly horns.",
    returnBridgeHint: "Riding on the gentle Brachiosaurus neck right back into the home yard.",
    moralPayoffPhrase: "Even the biggest giants in the world can have the gentlest hearts.",
    soundWordPalette: ["STOMP-STOMP!", "ROAR!", "CRACK!", "RUMBLE...", "SWOOSH!"],
    goals: [
      { text: "To learn how to roar like a King.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To walk with the Giants of old.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To save the Dino-Egg from the volcano.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the 'Leaf of Healing' for the T-Rex.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To hide from the meteor shower.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "The roars are very loud!", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The ground shakes when they dance.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Not getting stepped on by a clumsy Brachiosaurus.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Finding food in a strange land.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The volcano is starting to smoke.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-space': {
    heritageContext: "The Hope Probe & Mars Mission.",
    visualStyle: "Cosmic purples, high-tech suits, the blue marble of Earth.",
    homeBaseSuggestion: "A cozy bedroom with a cardboard rocket ship and planet stickers.",
    anchorObject: "A glowing cosmic beacon communicator.",
    anchorTriggerRule: "Beeps with starlight signal when pointing toward Earth.",
    companionGuide: "A bubbly little rover robot on bouncy wheels.",
    returnBridgeHint: "Rocketing smoothly down through soft clouds to land safely on the bedroom rug.",
    moralPayoffPhrase: "No matter how far across the stars we fly, the warmest planet is home.",
    soundWordPalette: ["3-2-1 BLASTOFF!", "BEEP-BOOP", "WHOOSH!", "FLOAT...", "PING!"],
    goals: [
      { text: "To plant the flag of Friendship on Mars.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To fix the satellite that broadcasts lullabies.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To meet the Man in the Moon.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find a new home for the Star-Plant.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To race a comet around the rings of Saturn.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "Zero gravity makes floating tricky.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "Dodging the Asteroid Belt of Bumps.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The rocket needs 'Imagination Fuel'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "It's very quiet and lonely in space.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The alien language is hard to understand.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-pyramid': {
    heritageContext: "The Great Pyramids of Giza & the Valley of the Kings.",
    visualStyle: "Towering limestone pyramids, hieroglyph-covered temple walls, golden sunbeams through stone pillars, the Nile's glow at dusk.",
    minAgeRecommended: 4,
    homeBaseSuggestion: "A sandy backyard corner with a toy pyramid built out of building blocks.",
    anchorObject: "A small stone scarab charm.",
    anchorTriggerRule: "Glows warm when feeling brave, turns cool and dim when feeling unsure.",
    companionGuide: "A small stone cat statue that blinks awake and offers to walk beside the hero.",
    returnBridgeHint: "The scarab glows bright, and the sand carries the hero gently back to the backyard pyramid.",
    moralPayoffPhrase: "Even the smallest helper can wake up something ancient and good.",
    soundWordPalette: ["SHIFT!", "CRUMBLE!", "ECHO...", "TAP-TAP!", "WHOOSH!"],
    contentWatchlist: ["No skulls, skeletons, or corpse imagery — use scarabs, stone cats, or sand spirits instead."],
    goals: [
      { text: "To open the Door of Sands.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To return the Mummy's cat.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the scroll of Ancient Jokes.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To wake the Sleeping Sphinx.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To light the torch of the Deep Tomb.", ageBand: ["4-5", "6-8", "9-12"] }
    ],
    challenges: [
      { text: "The torch keeps flickering out.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The scarab beetles tickle your feet.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The maze of the pyramid shifts.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "Answering the Sphinx's three questions.", ageBand: ["6-8", "9-12"] },
      { text: "Deciphering hieroglyphs.", ageBand: ["6-8", "9-12"] }
    ]
  },
  'adv-cooking': {
    heritageContext: "The Royal Kitchens of the Sultan.",
    visualStyle: "Flour clouds, colorful ingredients, warm oven glow, copper pots.",
    homeBaseSuggestion: "A cozy kitchen counter with a toy apron and wooden spoons.",
    anchorObject: "A gleaming Copper Spoon.",
    anchorTriggerRule: "Stirs with sweet warmth when adding friendship and care to the recipe.",
    companionGuide: "A little dough-man that hops around sprinkling cinnamon.",
    returnBridgeHint: "Wiping flour off happy cheeks and sitting at the warm kitchen table.",
    moralPayoffPhrase: "The secret ingredient in every great feast is sharing it with love.",
    soundWordPalette: ["SIZZLE!", "SPLAT!", "CLATTER!", "SNIFF-SNIFF", "YUM!"],
    goals: [
      { text: "To bake the 'Giant Cake of Happiness'.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To win the Copper Spoon in the Great Cook-off.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To find the secret ingredient for the Royal Soup.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "To cook a feast for the hungry Forest Giants.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "To open a restaurant that serves starlight.", ageBand: ["6-8", "9-12"] }
    ],
    challenges: [
      { text: "The ingredients keep running away.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The dough keeps growing and growing!", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The naughty 'Salt Sprites' trying to ruin the taste.", ageBand: ["1-3", "4-5", "6-8", "9-12"] },
      { text: "The recipe is written in invisible ink.", ageBand: ["4-5", "6-8", "9-12"] },
      { text: "The oven is a grumpy dragon mouth.", ageBand: ["6-8", "9-12"] }
    ]
  }
};


export const THEME_ALIASES: Record<string, string> = {
  'val-dentist': 'val-dentist',
  'val-siblings': 'val-siblings',
  'adv-magic-obj': 'adv-magic-obj',
  'adv-daily': 'adv-daily',
  'adv-animals': 'adv-animal',
  'adv-dinosaur': 'adv-dino',
  'adv-dinosaurs': 'adv-dino',
  'adv-pyramids': 'adv-pyramid',
  // Natural Language & Storefront Name Aliases
  'animal adventures': 'adv-animal',
  'animals': 'adv-animal',
  'talking to animals and understanding their language': 'adv-animal',
  'space adventure': 'adv-space',
  'space': 'adv-space',
  'pyramid adventure': 'adv-pyramid',
  'pyramids': 'adv-pyramid',
  'treasure hunt': 'adv-treasure',
  'treasure': 'adv-treasure',
  'fantasy play': 'adv-fantasy',
  'fantasy': 'adv-fantasy',
  'magical objects': 'adv-magic-obj',
  'magic': 'adv-magic',
  'mini nature adventure': 'adv-mini-nature',
  'nature': 'adv-mini-nature',
  'lost and found': 'adv-lost-found',
  'lost and found journey': 'adv-lost-found',
  'dinosaur adventure': 'adv-dino',
  'dinosaurs': 'adv-dino',
  'staying tidy': 'val-tidy',
  'tidy': 'val-tidy',
  'sharing toys': 'val-sharing-toys',
  'sharing': 'val-sharing-toys',
  'helping others': 'val-helping',
  'helping': 'val-helping',
  'the importance of honesty': 'val-honesty',
  'honesty': 'val-honesty',
  'respect': 'val-respect',
  'bravery at the dentist': 'val-dentist',
  'bravery': 'val-bravery',
  'bedtime & sleep': 'val-sleep',
  'sleep': 'val-sleep',
  'bedtime': 'val-sleep',
  'school': 'val-school',
  'potty': 'val-potty',
  'teamwork': 'val-teamwork',
  'cooking': 'adv-cooking',
  'daily life adventure': 'adv-daily'
};

export function resolveThemeId(themeIdOrName: string): string {
  if (!themeIdOrName) return '';
  const clean = themeIdOrName.toLowerCase().trim();
  if (themeLibrary[clean]) return clean;
  if (THEME_ALIASES[clean]) return THEME_ALIASES[clean];
  
  for (const [alias, targetId] of Object.entries(THEME_ALIASES)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return targetId;
    }
  }
  return clean;
}

export function getGuidelineForTheme(storyData: StoryData): string {
  const themeId = resolveThemeId(storyData.themeId || storyData.theme || '');
  const themeContent = themeLibrary[themeId];

  // Custom theme fallback
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

  const age = parseInt(storyData.childAge || "5", 10);
  const ageBand = age <= 3 ? '1-3' : age <= 5 ? '4-5' : age <= 8 ? '6-8' : '9-12';

  const filterItems = (items: ThemeItem[]): string[] => {
    const matching = items
      .filter(item => typeof item === 'string' || !item.ageBand || item.ageBand.includes(ageBand))
      .map(item => (typeof item === 'string' ? item : item.text));
    return matching.length > 0 ? matching : items.map(item => (typeof item === 'string' ? item : item.text));
  };

  const candidateGoals = filterItems(themeContent.goals);
  const candidateChallenges = filterItems(themeContent.challenges);

  const goal = storyData.customGoal || candidateGoals[Math.floor(Math.random() * candidateGoals.length)];
  const challenge = storyData.customChallenge || candidateChallenges[Math.floor(Math.random() * candidateChallenges.length)];

  let contextLock = "";
  if (themeId) {
    const parts = themeId.split('-');
    const category = parts[0];
    const name = parts[1];
    contextLock = `STRICT SETTING LOCK: This is a ${category} story specifically about ${name}. Do NOT use generic 'backyards' or 'gardens' unless that is the Heritage Context below.\n`;
  }

  return `${contextLock}
**Heritage Context:** ${themeContent.heritageContext}
**Home Base Idea:** ${themeContent.homeBaseSuggestion || "A cozy, familiar starting space."}
**Anchor Device:** ${themeContent.anchorObject || "A special personal item"} (Rule: ${themeContent.anchorTriggerRule || "Glows warm when happy, cools when worried"})
**Goal:** ${goal}
**Challenge:** ${challenge}
**Companion Guide:** ${themeContent.companionGuide || "A friendly talking animal guide"}
**Return Bridge Hint:** ${themeContent.returnBridgeHint || "Traveling safely back home to the starting space"}
**Moral Payoff:** ${themeContent.moralPayoffPhrase || "A warm child realization"}
**Visual Style:** ${themeContent.visualStyle}
**Planner Beats:**
1. **Setup:** {child_name} starts in Home Base: ${themeContent.homeBaseSuggestion || themeContent.heritageContext}
2. **Catalyst:** They set out to: ${goal}
3. **Escalation:** They face the obstacle: ${challenge}
4. **Shift:** They overcome it using the values of the theme.
5. **Resolution:** Seamless return bridge to Home Base with cozy bedtime payoff.
`.replace(/{child_name}/g, storyData.childName)
    .replace(/{child_age}/g, storyData.childAge);
}

export function getGuidelineComponentsForTheme(
  themeIdOrName: string, 
  age?: number
): { 
  goal: string; 
  challenge: string; 
  illustrationNotes: string;
  anchorObject?: string;
  anchorTriggerRule?: string;
  homeBaseSuggestion?: string;
  returnBridgeHint?: string;
  moralPayoffPhrase?: string;
} | null {
  const resolvedId = resolveThemeId(themeIdOrName);
  const theme = themeLibrary[resolvedId] || themeLibrary[themeIdOrName];
  if (!theme) return null;

  const ageBand = age ? (age <= 3 ? '1-3' : age <= 5 ? '4-5' : age <= 8 ? '6-8' : '9-12') : undefined;

  const filterItems = (items: ThemeItem[]): string[] => {
    if (!ageBand) {
      return items.map(item => (typeof item === 'string' ? item : item.text));
    }
    const matching = items
      .filter(item => typeof item === 'string' || !item.ageBand || item.ageBand.includes(ageBand))
      .map(item => (typeof item === 'string' ? item : item.text));
    return matching.length > 0 ? matching : items.map(item => (typeof item === 'string' ? item : item.text));
  };

  const candidateGoals = filterItems(theme.goals);
  const candidateChallenges = filterItems(theme.challenges);

  // RANDOMIZATION LOGIC: Pick one random goal and one random challenge matching age
  const randomGoal = candidateGoals[Math.floor(Math.random() * candidateGoals.length)];
  const randomChallenge = candidateChallenges[Math.floor(Math.random() * candidateChallenges.length)];

  return {
    goal: randomGoal,
    challenge: randomChallenge,
    illustrationNotes: theme.visualStyle,
    anchorObject: theme.anchorObject,
    anchorTriggerRule: theme.anchorTriggerRule,
    homeBaseSuggestion: theme.homeBaseSuggestion,
    returnBridgeHint: theme.returnBridgeHint,
    moralPayoffPhrase: theme.moralPayoffPhrase
  };
}
