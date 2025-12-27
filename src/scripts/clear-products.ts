
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearProducts() {
    console.log('--- Clearing Products Table ---');
    console.log('Target DB:', supabaseUrl);

    try {
        // First check count
        const { count, error: countError } = await supabase.from('Product').select('*', { count: 'exact', head: true });
        if (countError) throw countError;
        console.log(`Found ${count} products before deletion.`);

        if (count === 0) {
            console.log('No products to delete.');
            return;
        }

        // Delete all products (using a condition that matches all, e.g. id is not null/empty)
        // Assuming IDs are strings.
        const { error } = await supabase.from('Product').delete().neq('id', 'placeholder_impossible_id');

        if (error) {
            // Check for FK violation
            if (error.code === '23503') { // foreign_key_violation
                console.error('❌ Failed to delete products due to Foreign Key constraints.');
                console.error('This usually means there are Orders or OrderItems referencing these products.');
                console.error('You may need to clear Orders first.');
            } else {
                console.error('Error deleting products:', error);
            }
        } else {
            console.log('✅ Successfully cleared Product table.');
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

clearProducts();
