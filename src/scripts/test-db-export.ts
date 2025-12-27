
import dotenv from 'dotenv';
import path from 'path';

// Load env BEFORE importing db
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function test() {
    try {
        console.log('--- Testing getSettings Export (Dynamic) ---');
        // Dynamic import to ensure process.env is populated
        const { getSettings } = await import('@/lib/db');

        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

        const settings = await getSettings();
        console.log('Result:', JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
