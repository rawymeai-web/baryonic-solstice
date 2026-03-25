
/**
 * Test script for director.ts: generateVisualPlan
 * Run with: npx tsx test_director_flow.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.local into process.env before importing services
const envPath = path.resolve(__dirname, '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env.local:", result.error);
}

// Verify key is loaded
if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from process.env!");
    process.exit(1);
} else {
    console.log("Environment loaded. Key length:", process.env.GEMINI_API_KEY.length);
}

// NOW import the service which relies on process.env
import { generateVisualPlan } from './src/services/visual/director';
import { StoryBlueprint } from './src/types';

const mockScript = [
    { text: "Once upon a time, a brave little toaster set off on a journey." },
    { text: "He met a lamp who loved to shine bright." },
    { text: "Together, they found a plug socket in the wall." }
];

const mockBlueprint: StoryBlueprint = {
    foundation: {
        title: "The Brave Toaster",
        targetAge: "4-6",
        storyCore: "Friendship is electric",
        heroDesire: "To be useful",
        mainChallenge: "Cord too short",
        primaryVisualAnchor: "The Golden Plug", // NEW
        moral: "Connection matters",
        failedAttemptSpread: 3,
        insightSpread: 4,
        finalSolutionMethod: "Teamwork"
        // Legacy fields omitted or can be added if optional
    },
    characters: {
        heroProfile: "Shiny chrome toaster with a brave handle",
        supportingRoles: [
            {
                name: "Lampy",
                role: "Sidekick",
                functionType: "Illuminator",
                visualKey: "Brass lamp with warm bulb"
            },
            {
                name: "Dusty",
                role: "Villain",
                functionType: "Obstacle",
                visualKey: "Old gray vacuum"
            }
        ]
    },
    structure: {
        arcSummary: "Toaster leaves the counter, finds a friend, and gets plugged in.",
        spreads: [
            {
                spreadNumber: 1,
                narrative: "Once upon a time, a brave little toaster set off on a journey.",
                emotionalBeat: "Curiosity",
                specificLocation: "Kitchen Counter",
                environmentType: "Indoor",
                timeOfDay: "Morning",
                lighting: "Bright",
                mood: "Adventurous"
            },
            {
                spreadNumber: 2,
                narrative: "He met a lamp who loved to shine bright.",
                emotionalBeat: "Friendship",
                specificLocation: "Kitchen Floor",
                environmentType: "Indoor",
                timeOfDay: "Morning",
                lighting: "Warm",
                mood: "Friendly"
            },
            {
                spreadNumber: 3,
                narrative: "Together, they found a plug socket in the wall.",
                emotionalBeat: "Triumph",
                specificLocation: "Wall Socket",
                environmentType: "Indoor",
                timeOfDay: "Noon",
                lighting: "Electric",
                mood: "Excited"
            }
        ]
    }
};

// A visual DNA string (normally generated from style + theme)
const mockVisualDNA = "Style: Pixar-style 3D animation. Lighting: Soft morning sunlight. Colors: Warm metals, cozy kitchen colors. Textures: High gloss chrome, soft fabric cord.";

async function runTest() {
    console.log("=== STARTING VISUAL PLAN SIMULATION ===");

    try {
        console.log("Calling generateVisualPlan...");
        const response = await generateVisualPlan(mockScript, mockBlueprint, mockVisualDNA);

        console.log("--- RESULT ---");
        if (response.log.status === 'Success') {
            console.log("SUCCESS!");
            console.log("Spreads generated:", response.result.spreads.length);
            console.log("First spread setting:", response.result.spreads[0]?.setting);
        } else {
            console.log("FAILURE LOGGED:");
            console.log(response.log);
        }

    } catch (error) {
        console.error("CRITICAL ERROR (Uncaught):", error);
    }
}

runTest();
