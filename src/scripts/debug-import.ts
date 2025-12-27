
import dotenv from 'dotenv';
import path from 'path';

// Load env BEFORE importing actions
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function debugImport() {
    console.log('--- Starting Debug Import Script (Dynamic) ---');
    try {
        // Dynamic import to ensure env is ready before modules load
        const { importWoocommerceOrdersAction } = await import('@/app/actions');

        console.log('Running import action...');
        const result = await importWoocommerceOrdersAction();
        console.log('--- Import Result ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('--- Import Exception ---');
        console.error(e);
    }
}

debugImport();
