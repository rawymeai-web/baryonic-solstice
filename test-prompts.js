const fetch = require('node-fetch');

async function testGeneration() {
    try {
        const res = await fetch('http://localhost:3000/api/generate/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan: { spreads: [{ spreadNumber: 0, setting: 'test', keyActions: 'test' }] },
                blueprint: {},
                visualDNA: 'Style: Digital Watercolor. Theme: Adventure',
                childAge: '4',
                childDescription: 'A young boy',
                childName: 'Zayn',
                language: 'en'
            })
        });

        const text = await res.text();
        console.log("RESPONSE:", text);
    } catch (e) {
        console.error("ERROR:", e);
    }
}

testGeneration();
