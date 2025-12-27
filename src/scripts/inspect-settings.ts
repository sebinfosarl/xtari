
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function inspect() {
    console.log('--- Inspecting Full Settings Row 1 ---');
    const { data, error } = await supabase.from('Settings').select('*').eq('id', 1).single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('CATHEDIS_USER:', data.cathedis?.username);
    console.log('CATHEDIS_CONNECTED:', data.cathedis?.isConnected);
    console.log('PICKUP_LOCATIONS:', data.pickupLocations);
}

inspect();
