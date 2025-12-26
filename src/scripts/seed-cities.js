const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase keys in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    try {
        console.log('Fetching cities from Cathedis API...');
        const API_URL = 'https://v1.cathedis.delivery';
        const response = await fetch(`${API_URL}/ws/public/c2c/city?deliveryAvailability=true`);

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const result = await response.json();
        const cities = result.data || [];
        console.log(`Found ${cities.length} cities.`);

        console.log('Clearing existing cities from DB...');
        const { error: delError } = await supabase.from('City').delete().neq('id', '0');
        if (delError) {
            // Ignore error if table is empty or permission denied (though we shouldn't get denied)
            console.warn('Delete warning (might be empty):', delError.message);
        }

        console.log('Inserting cities...');
        const CHUNK_SIZE = 50;
        let insertedCount = 0;

        for (let i = 0; i < cities.length; i += CHUNK_SIZE) {
            const chunk = cities.slice(i, i + CHUNK_SIZE).map(c => ({
                id: c.id.toString(),
                name: c.name,
                sectors: c.sectors || [],
                updatedAt: new Date().toISOString()
            }));

            const { error: insError } = await supabase.from('City').upsert(chunk);
            if (insError) {
                console.error(`Error inserting chunk ${i}:`, insError.message);
            } else {
                insertedCount += chunk.length;
                process.stdout.write(`\rInserted: ${insertedCount}/${cities.length}`);
            }
        }
        console.log('\nSeed completed successfully!');
    } catch (e) {
        console.error('Seed script failed:', e);
    }
}

seed();
