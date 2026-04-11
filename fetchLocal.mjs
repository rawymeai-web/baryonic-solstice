import fs from 'fs';

async function run() {
    try {
        const res = await fetch("http://localhost:3000/api/debug?id=RWY-9BJD5J6UA");
        const data = await res.json();
        fs.writeFileSync('debug_rw.json', JSON.stringify(data, null, 2));
        console.log("Success");
    } catch (e) {
        console.log("Error:", e);
    }
}
run();
