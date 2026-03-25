
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('order_analysis_T0S7NOX1R.json', 'utf8'));

console.log('--- Order Analysis: ' + data.orderNumber + ' ---');
data.pages.forEach(p => {
    console.log('\n=== Spread ' + p.pageNumber + ' ===');
    const prompt = p.actualPrompt || '';

    // Extract key sections
    const goalMatch = prompt.match(/\*\* GOAL:\*\*(.*?)\n/s);
    const cameraMatch = prompt.match(/- \*\* CAMERA LENS:\*\*(.*?)\n/s);
    const lightingMatch = prompt.match(/- Lighting:(.*?)\n/s);
    const logicMatch = prompt.match(/- \*\*Lighting Logic:\*\* (.*?)- No typography/s);
    const colorMatch = prompt.match(/- \*\*Color Decay:\*\* (.*?)\n/s);

    console.log('Goal:', goalMatch ? goalMatch[1].trim() : 'N/A');
    console.log('Camera:', cameraMatch ? cameraMatch[1].trim() : 'N/A');
    console.log('Lighting:', lightingMatch ? lightingMatch[1].trim() : 'N/A');
    console.log('Color Decay Rule:', colorMatch ? colorMatch[1].trim() : 'N/A');
    console.log('Lighting Logic Rule:', logicMatch ? logicMatch[1].trim().replace(/\n/g, ' ') : 'N/A');
});
