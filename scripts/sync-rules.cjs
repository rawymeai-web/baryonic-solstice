// scripts/sync-rules.cjs
// Utility to verify and synchronize rules (guidebook.ts, validator.ts) between backend and frontend.

const fs = require('fs');
const path = require('path');

const BACKEND_RULES_DIR = path.resolve(__dirname, '../src/services/rules');
const FRONTEND_RULES_DIR = path.resolve(__dirname, '../../pulsing-planetary/services/rules');

const SHARED_FILES = ['guidebook.ts', 'validator.ts'];

function checkSync(shouldAutoFix = false) {
    console.log('[Sync-Rules] Checking shared rules consistency...');

    if (!fs.existsSync(FRONTEND_RULES_DIR)) {
        console.log(`[Sync-Rules] Sibling frontend directory not found at ${FRONTEND_RULES_DIR}. Skipping cross-repo check.`);
        return;
    }

    let hasMismatch = false;

    for (const filename of SHARED_FILES) {
        const backendPath = path.join(BACKEND_RULES_DIR, filename);
        const frontendPath = path.join(FRONTEND_RULES_DIR, filename);

        if (!fs.existsSync(backendPath)) {
            console.error(`[Sync-Rules] ERROR: Backend file missing: ${backendPath}`);
            hasMismatch = true;
            continue;
        }

        if (!fs.existsSync(frontendPath)) {
            console.error(`[Sync-Rules] ERROR: Frontend file missing: ${frontendPath}`);
            hasMismatch = true;
            continue;
        }

        const backendContent = fs.readFileSync(backendPath, 'utf8').replace(/\r\n/g, '\n').trim();
        const frontendContent = fs.readFileSync(frontendPath, 'utf8').replace(/\r\n/g, '\n').trim();

        if (backendContent !== frontendContent) {
            hasMismatch = true;
            console.warn(`[Sync-Rules] ⚠️ Divergence detected in ${filename}!`);

            if (shouldAutoFix) {
                console.log(`[Sync-Rules] Syncing ${filename} from backend -> frontend...`);
                fs.writeFileSync(frontendPath, fs.readFileSync(backendPath, 'utf8'));
                console.log(`[Sync-Rules] ✓ Synced ${filename}.`);
            }
        } else {
            console.log(`[Sync-Rules] ✓ ${filename} is in sync.`);
        }
    }

    if (hasMismatch && !shouldAutoFix) {
        console.error('\n[Sync-Rules] ERROR: Rules files are out of sync between baryonic-solstice and pulsing-planetary.');
        console.error('Run "npm run sync:rules" to synchronize from backend to frontend.\n');
        process.exit(1);
    } else if (!hasMismatch) {
        console.log('\n[Sync-Rules] All shared rules are 100% in sync!\n');
    }
}

const isFix = process.argv.includes('--fix') || process.argv.includes('--sync');
checkSync(isFix);
