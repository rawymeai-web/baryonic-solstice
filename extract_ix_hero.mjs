import fs from 'fs';

let rawContent = fs.readFileSync('ix_recover_data_utf8.json', 'utf8');

// Remove BOM if present
if (rawContent.charCodeAt(0) === 0xFEFF) {
    rawContent = rawContent.slice(1);
}

// Remove the [dotenv@...] line
const jsonString = rawContent.replace(/^\[dotenv@[\s\S]*?\n/, '').trim();

try {
    const data = JSON.parse(jsonString);
    const storyData = data.story_data;

    const heroData = {
        mainCharacter: storyData.mainCharacter,
        secondCharacter: storyData.secondCharacter,
        styleReferenceImageBase64: storyData.styleReferenceImageBase64,
        selectedStylePrompt: storyData.selectedStylePrompt,
        childAge: storyData.childAge,
        language: storyData.language,
        theme: storyData.theme
    };

    fs.writeFileSync('j13_hero_restore.json', JSON.stringify(heroData, null, 2));
    console.log("SUCCESS: Hero data written to j13_hero_restore.json");
} catch (e) {
    process.stderr.write("FAILED TO PARSE JSON: " + e.message + "\n");
    process.stderr.write("Content Start: " + jsonString.substring(0, 500) + "\n");
}
