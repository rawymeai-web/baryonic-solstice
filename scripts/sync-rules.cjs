// scripts/sync-rules.cjs
// Utility to verify and synchronize rules and catalog (guidebook.ts, validator.ts, arcCatalog.ts, arcCatalogData.json) between backend and frontend.

const fs = require('fs');
const path = require('path');

const BACKEND_BASE = path.resolve(__dirname, '../src/services');
const FRONTEND_BASE = path.resolve(__dirname, '../../pulsing-planetary/services');

const SYNC_TARGETS = [
    {
        name: 'guidebook.ts',
        src: path.join(BACKEND_BASE, 'rules/guidebook.ts'),
        dest: path.join(FRONTEND_BASE, 'rules/guidebook.ts')
    },
    {
        name: 'validator.ts',
        src: path.join(BACKEND_BASE, 'rules/validator.ts'),
        dest: path.join(FRONTEND_BASE, 'rules/validator.ts')
    },
    {
        name: 'arcCatalog.ts',
        src: path.join(BACKEND_BASE, 'story/arcCatalog.ts'),
        dest: path.join(FRONTEND_BASE, 'story/arcCatalog.ts')
    },
    {
        name: 'arcCatalogData.json',
        src: path.join(BACKEND_BASE, 'story/arcCatalogData.json'),
        dest: path.join(FRONTEND_BASE, 'story/arcCatalogData.json')
    }
];

function checkSync(shouldAutoFix = false) {
    console.log('[Sync-Rules] Checking shared rules & catalog consistency...');

    if (!fs.existsSync(FRONTEND_BASE)) {
        console.log(`[Sync-Rules] Sibling frontend directory not found at ${FRONTEND_BASE}. Skipping cross-repo check.`);
        return;
    }

    let hasMismatch = false;

    for (const target of SYNC_TARGETS) {
        if (!fs.existsSync(target.src)) {
            console.error(`[Sync-Rules] ERROR: Backend file missing: ${target.src}`);
            hasMismatch = true;
            continue;
        }

        const backendContent = fs.readFileSync(target.src, 'utf8').replace(/\r\n/g, '\n').trim();
        const frontendExists = fs.existsSync(target.dest);
        const frontendContent = frontendExists ? fs.readFileSync(target.dest, 'utf8').replace(/\r\n/g, '\n').trim() : '';

        if (!frontendExists || backendContent !== frontendContent) {
            hasMismatch = true;
            console.warn(`[Sync-Rules] ⚠️ Divergence detected in ${target.name}!`);

            if (shouldAutoFix) {
                console.log(`[Sync-Rules] Syncing ${target.name} from backend -> frontend...`);
                fs.mkdirSync(path.dirname(target.dest), { recursive: true });
                fs.writeFileSync(target.dest, fs.readFileSync(target.src, 'utf8'));
                console.log(`[Sync-Rules] ✓ Synced ${target.name}.`);
            }
        } else {
            console.log(`[Sync-Rules] ✓ ${target.name} is in sync.`);
        }
    }

    if (hasMismatch && !shouldAutoFix) {
        console.error('\n[Sync-Rules] ERROR: Rules/catalog files are out of sync between baryonic-solstice and pulsing-planetary.');
        console.error('Run "node scripts/sync-rules.cjs --fix" to synchronize from backend to frontend.\n');
        process.exit(1);
    } else if (!hasMismatch) {
        console.log('\n[Sync-Rules] All shared rules and catalog files are 100% in sync!\n');
    }
}

const isFix = process.argv.includes('--fix') || process.argv.includes('--sync');
checkSync(isFix);

