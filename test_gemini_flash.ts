
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("No API Key found in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function testJsonGen() {
    console.log("Starting JSON Generation Test (Gemini 2.0 Flash)...");
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        console.log("Calling model...");
        const result = await model.generateContent("List 5 colors in JSON format: { colors: string[] }");

        console.log("Response received.");
        console.log(result.response.text());
        console.log("SUCCESS: Valid JSON received.");

    } catch (error: any) {
        console.error("Test Failed:", error);
        if (error.response) {
            console.error("Response data:", JSON.stringify(error.response, null, 2));
        }
    }
}

testJsonGen();
