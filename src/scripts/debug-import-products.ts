
import dotenv from 'dotenv';
import path from 'path';

// Load env env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function debugProducts() {
    console.log('--- Debug Products Import (Dynamic) ---');
    try {
        // Dynamic import logic
        const { importWoocommerceProductsAction } = await import('@/app/actions');

        console.log('Running import products action...');
        const result = await importWoocommerceProductsAction();
        console.log('--- Import Result ---');
        console.log(JSON.stringify(result, null, 2));

    } catch (e) {
        console.error('--- Import Exception ---');
        console.error(e);
    }
}

debugProducts();
