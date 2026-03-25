
import type { StoryTheme } from '../types';

export const colorfulBackgrounds = [
    'linear-gradient(135deg, #a6edf7 0%, #f0e68c 100%)',
    'linear-gradient(135deg, #ffdde1 0%, #ee9ca7 100%)',
    'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
];

export const TEXT_BLOB_COLOR = 'rgba(255, 255, 255, 0.45)';

export const ART_STYLE_OPTIONS = [
    // --- EXISTING KEPT & 3D ---
    { name: 'Cinematic 3D Pixar', category: '3d', prompt: 'High-end 3D animated film style. Features expressive characters with large eyes, rich subsurface scattering, and cinematic lighting with vibrant colors.', sampleUrl: '/style-previews/cinematic_3d_pixar_style.png' },
    { name: 'Dreamy Realism', category: '3d', prompt: 'A richly lit, cinematic painterly style inspired by animated feature lighting. It blends soft 3D realism with brush-painted warmth and magical atmosphere.', sampleUrl: '/style-previews/cinematic_painterly_realism.png' },
    { name: 'Epic Scenic', category: '3d', prompt: 'A detailed, atmospheric illustration style with a focus on dramatic natural lighting, grand scale, and immersive world-building.', sampleUrl: '/style-previews/cinematic_concept_art.png' },
    { name: 'Modern 3D Render', category: '3d', prompt: 'A soft, 3D-rendered illustration style, like a modern animated film. Features characters with round forms, rich lighting, and gentle shadows.', sampleUrl: '/style-previews/modern_3d_render.png' },

    // --- PAINTERLY & ARTISTIC ---
    { name: 'Painterly Anime', category: 'painterly', prompt: 'A beautiful, nostalgic illustration style inspired by classic Japanese animation (Ghibli). Features lush, painterly watercolor backgrounds, especially of nature and skies.', sampleUrl: '/style-previews/painterly_anime.png' },
    { name: 'Digital Watercolor', category: 'painterly', prompt: 'A beautiful and whimsical digital watercolor style. Features soft, dreamy washes with light color bleeding and a textured paper feel. Edges are loose and organic.', sampleUrl: '/style-previews/digital_watercolor.png' },
    { name: 'Gouache Art', category: 'painterly', prompt: 'A charming mixed-media style combining flat, opaque gouache blocks of color with colored pencil details for texture and shading. Handcrafted and organic.', sampleUrl: '/style-previews/mixed_media_gouache.png' },
    { name: 'Paper Cutout', category: 'textured', prompt: 'A creative style that mimics overlapping colored paper shapes with visible shadows to create a sense of layered depth.', sampleUrl: '/style-previews/paper_cutout.png' },

    // --- NEW & STYLIZED ---
    { name: 'Ultra Realistic', category: 'realistic', prompt: 'High-fidelity photography style. 8k resolution, highly detailed textures, realistic lighting and depth of field. Looks like a real photo.', sampleUrl: '/style-previews/ultra_realistic.png' },
    { name: 'Kawaii Cute', category: 'graphic', prompt: 'Super cute Kawaii style. Big sparkly eyes, soft pastel colors, rounded shapes, and a very happy, bubbly atmosphere.', sampleUrl: '/style-previews/kawaii_cute.png' },
    { name: 'Sticker Pop Art', category: 'graphic', prompt: 'Bold Sticker Art style. Thick white outlines around characters, vibrant solid colors, and a distinct "die-cut" sticker aesthetic.', sampleUrl: '/style-previews/sticker_pop_art.png' },
    { name: 'Block World', category: '3d', prompt: 'Voxel art style reminiscent of Minecraft. Everything is made of colorful cubes and blocks. Playful, digital, and fun.', sampleUrl: '/style-previews/block_world.png' },
    { name: 'Geometric Vector', category: 'graphic', prompt: 'Clean Geometric Vector style. Composed of simple shapes (circles, triangles) with flat colors and minimal shading. Modern and abstract.', sampleUrl: '/style-previews/geometric_vector.png' },
];

export const INITIAL_THEMES: StoryTheme[] = [
    // --- VALUES (8) ---
    {
        id: 'val-sleep',
        title: { ar: 'مغامرة الأحلام السعيدة', en: 'The Importance of Sleeping Early' },
        description: { ar: 'تعلم أهمية النوم للاستعداد لمغامرات الغد.', en: 'Learning the importance of rest to be ready for tomorrow\'s adventures.' },
        emoji: '🌙', category: 'values', visualDNA: 'Indigo and gold, Mashrabiya moon motifs.',
        skeleton: { storyCores: ["Overcoming reluctance to sleep.", "Security in routine."], catalysts: ["A promise of a dawn race."], limiters: ["The heavy-lidded sleep spell."], themeVisualDNA: ["Starry blankets."], settingMandates: ["Cozy Majlis."] }
    },
    {
        id: 'val-respect',
        title: { ar: 'حكمة الأجداد', en: 'Respecting Elders' },
        description: { ar: 'اكتشاف الحكمة في معاملة الأكبر سناً بلطف.', en: 'Discovering wisdom through treating elders with kindness.' },
        emoji: '👴', category: 'values', visualDNA: 'Warm cedar wood, golden Dallah pots.',
        skeleton: { storyCores: ["Empathy for the old.", "Listening before speaking."], catalysts: ["A locked story-chest."], limiters: ["The rule of silence."], themeVisualDNA: ["Zellige tiles."], settingMandates: ["Traditional courtyard."] }
    },
    {
        id: 'val-siblings',
        title: { ar: 'أبطال الأخوة', en: 'The Love of Siblings' },
        description: { ar: 'كيف نكون فريقاً رائعاً مع إخوتنا.', en: 'How to be a great team with our brothers and sisters.' },
        emoji: '🤝', category: 'values', visualDNA: 'Bright matching colors, connected paths.',
        skeleton: { storyCores: ["Conflict resolution.", "Protecting each other."], catalysts: ["A shared puzzle."], limiters: ["The tangled kite string."], themeVisualDNA: ["Twin peaks."], settingMandates: ["The Play Room."] }
    },
    {
        id: 'val-dentist',
        title: { ar: 'بطل الأسنان اللامعة', en: 'Bravery at the Dentist' },
        description: { ar: 'التغلب على الخوف للحصول على ابتسامة صحية.', en: 'Overcoming fear to get a healthy, shiny smile.' },
        emoji: '🦷', category: 'values', visualDNA: 'Clean mint greens, shiny whites.',
        skeleton: { storyCores: ["Facing medical fears.", "Pride in self-care."], catalysts: ["A wiggly tooth."], limiters: ["The appointment time."], themeVisualDNA: ["Sparkling mirrors."], settingMandates: ["Dr. Smile's Clinic."] }
    },
    {
        id: 'val-honesty',
        title: { ar: 'مرآة الصدق', en: 'The Importance of Honesty' },
        description: { ar: 'كيف يجعلنا الصدق نشعر بالخفة والجمال.', en: 'How honesty makes us feel light and beautiful.' },
        emoji: '💎', category: 'values', visualDNA: 'Crystal clear water, bright sunbeams.',
        skeleton: { storyCores: ["Consequences of a small lie.", "The relief of truth."], catalysts: ["A broken vase."], limiters: ["The growing shadow of a lie."], themeVisualDNA: ["Reflecting pools."], settingMandates: ["The Glass Garden."] }
    },
    {
        id: 'val-helping',
        title: { ar: 'يد العون', en: 'Helping Others' },
        description: { ar: 'السعادة الحقيقية تأتي من مساعدة من يحتاج.', en: 'True happiness comes from helping those in need.' },
        emoji: '🤲', category: 'values', visualDNA: 'Warm sunlight, open hands imagery.',
        skeleton: { storyCores: ["Altruism.", "Community spirit."], catalysts: ["A neighbor with heavy bags."], limiters: ["The fading daylight."], themeVisualDNA: ["Golden paths."], settingMandates: ["The Busy Street."] }
    },
    {
        id: 'val-tidy',
        title: { ar: 'سحر الترتيب', en: 'Staying Tidy' },
        description: { ar: 'تحويل التنظيف إلى لعبة ممتعة ومفيدة.', en: 'Turning cleaning up into a fun and useful game.' },
        emoji: '🧹', category: 'values', visualDNA: 'Organized geometric shapes, sparkle effects.',
        skeleton: { storyCores: ["Responsibility.", "Creating order."], catalysts: ["A lost favorite toy."], limiters: ["The messy flood."], themeVisualDNA: ["Puzzle piece floors."], settingMandates: ["The Topsy-Turvy Room."] }
    },
    {
        id: 'val-sharing-toys',
        title: { ar: 'مملكة المشاركة', en: 'Sharing Toys' },
        description: { ar: 'اللعب يصبح أجمل عندما نتشاركه مع الأصدقاء.', en: 'Playing becomes more beautiful when shared with friends.' },
        emoji: '🧸', category: 'values', visualDNA: 'Multi-colored blocks, bridges between islands.',
        skeleton: { storyCores: ["Overcoming possessiveness.", "Joy of shared play."], catalysts: ["A new toy everyone wants."], limiters: ["The 10-minute timer."], themeVisualDNA: ["Connected forts."], settingMandates: ["The Community Park."] }
    },

    // --- ADVENTURES (9) ---
    {
        id: 'adv-lost-found',
        title: { ar: 'رحلة المفقودات', en: 'Lost and Found Journey' },
        description: { ar: 'مغامرة للبحث عن شيء ثمين مفقود.', en: 'An adventure to search for something precious that was lost.' },
        emoji: '🗺️', category: 'adventures', visualDNA: 'Map textures, compass motifs.',
        skeleton: { storyCores: ["Perseverance.", "Observation skills."], catalysts: ["A missing necklace."], limiters: ["The wind blowing tracks away."], themeVisualDNA: ["Magnifying glass views."], settingMandates: ["The Maze Garden."] }
    },
    {
        id: 'adv-mini-nature',
        title: { ar: 'سفاري الحديقة الخلفية', en: 'Mini Nature Adventure' },
        description: { ar: 'اكتشاف عالم كامل من المخلوقات الصغيرة.', en: 'Discovering a whole world of tiny creatures.' },
        emoji: '🐞', category: 'adventures', visualDNA: 'Macro photography style, lush greens.',
        skeleton: { storyCores: ["Appreciation of nature.", "Curiosity."], catalysts: ["A trail of ants."], limiters: ["The coming rain."], themeVisualDNA: ["Giant leaf canopies."], settingMandates: ["The Tall Grass."] }
    },
    {
        id: 'adv-daily',
        title: { ar: 'مغامرة اليوم العادي', en: 'Daily Life Adventure' },
        description: { ar: 'تحويل المهام العادية إلى بطولات خارقة.', en: 'Turning ordinary tasks into superhero feats.' },
        emoji: '☀️', category: 'adventures', visualDNA: 'Bright daylight, comic book accents.',
        skeleton: { storyCores: ["Imagination.", "Finding joy in routine."], catalysts: ["A grocery trip."], limiters: ["The melting ice cream."], themeVisualDNA: ["Super-vision outlines."], settingMandates: ["The Super Supermarket."] }
    },
    {
        id: 'adv-animal',
        title: { ar: 'أصدقاء الغابة', en: 'Animal Adventures' },
        description: { ar: 'التحدث مع الحيوانات وفهم لغتها.', en: 'Talking to animals and understanding their language.' },
        emoji: '🦁', category: 'adventures', visualDNA: 'Vibrant jungle colors, animal prints.',
        skeleton: { storyCores: ["Empathy for nature.", "Communication."], catalysts: ["A lonely lion cub."], limiters: ["The river rising."], themeVisualDNA: ["Paw prints."], settingMandates: ["The Whispering Woods."] }
    },
    {
        id: 'adv-magic-obj',
        title: { ar: 'القطعة السحرية', en: 'Magical Objects' },
        description: { ar: 'العثور على غرض عادي يمتلك قوى عجيبة.', en: 'Finding an ordinary object that has amazing powers.' },
        emoji: '✨', category: 'adventures', visualDNA: 'Glowing auras, floating particles.',
        skeleton: { storyCores: ["Responsibility with power.", "Creativity."], catalysts: ["A pen that draws real things."], limiters: ["The ink running out."], themeVisualDNA: ["Sparkle dust."], settingMandates: ["The Attic."] }
    },
    {
        id: 'adv-fantasy',
        title: { ar: 'عالم الخيال', en: 'Fantasy Play' },
        description: { ar: 'عندما تتحول الغرفة إلى قلعة أو فضاء.', en: 'When the room turns into a castle or outer space.' },
        emoji: '🏰', category: 'adventures', visualDNA: 'Dreamlike mists, impossible architecture.',
        skeleton: { storyCores: ["Unlimited imagination.", "Leadership."], catalysts: ["A cardboard box fortress."], limiters: ["Dinner time."], themeVisualDNA: ["Cloud castles."], settingMandates: ["The Dreamscape."] }
    },
    {
        id: 'adv-treasure',
        title: { ar: 'كنز القراصنة الصغار', en: 'Treasure Hunt' },
        description: { ar: 'اتبع الخريطة لتجد الكنز المخبأ.', en: 'Follow the map to find the hidden treasure.' },
        emoji: '🏴‍☠️', category: 'adventures', visualDNA: 'Gold coins, tropical beaches.',
        skeleton: { storyCores: ["Problem solving.", "Teamwork."], catalysts: ["X marks the spot."], limiters: ["The tie."], themeVisualDNA: ["Palm trees."], settingMandates: ["Skull Rock Island."] }
    },
    {
        id: 'adv-dino',
        title: { ar: 'زئير الديناصور', en: 'Dinosaur Adventure' },
        description: { ar: 'العودة بالزمن لعصر العمالقة.', en: 'Going back in time to the age of giants.' },
        emoji: '🦖', category: 'adventures', visualDNA: 'Prehistoric ferns, volcanic skies.',
        skeleton: { storyCores: ["Bravery.", "Discovery."], catalysts: ["A fossil coming to life."], limiters: ["The volcano rumbling."], themeVisualDNA: ["Giant footprints."], settingMandates: ["Dino Valley."] }
    },
    {
        id: 'adv-space',
        title: { ar: 'رحلة الكواكب', en: 'Space Adventure' },
        description: { ar: 'استكشاف النجوم والكواكب البعيدة.', en: 'Exploring stars and distant planets.' },
        emoji: '🚀', category: 'adventures', visualDNA: 'Deep space blacks, neon nebulas.',
        skeleton: { storyCores: ["Exploration.", "Science."], catalysts: ["A rocket in the backyard."], limiters: ["Oxygen levels."], themeVisualDNA: ["Star fields."], settingMandates: ["Mars Base."] }
    },
    {
        id: 'adv-pyramid',
        title: { ar: 'مغامرة الأهرامات', en: 'Pyramid Adventure' },
        description: { ar: 'اكتشاف أسرار الفراعنة والكنوز القديمة.', en: 'Discovering the secrets of the Pharaohs and ancient treasures.' },
        emoji: '🐫', category: 'adventures', visualDNA: 'Golden sands, ancient stone textures, hieroglyphs.',
        skeleton: { storyCores: ["Curiosity about the past.", "Respect for history."], catalysts: ["A hidden hieroglyph glowing."], limiters: ["The shifting sands."], themeVisualDNA: ["Hieroglyphic patterns."], settingMandates: ["The Hidden Chamber."] }
    }
];

export const getStyleForWriteYourOwn = (age: string): string => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum)) return ART_STYLE_OPTIONS[0].prompt;
    if (ageNum <= 2) return ART_STYLE_OPTIONS[0].prompt;
    return ART_STYLE_OPTIONS[3].prompt;
};
