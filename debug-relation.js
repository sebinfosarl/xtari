
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.local')));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- RELATIONAL FETCH TEST ---');

    // Try default relationship detection
    const { data, error } = await supabase.from('Order').select('id, items:OrderItem(*)').limit(1);

    if (error) {
        console.log('Fetch Error:', error.message);
        console.log('Hint:', error.hint);
    } else {
        console.log('Fetch Success.');
        if (data && data.length > 0) {
            console.log('Order ID:', data[0].id);
            console.log('Items:', JSON.stringify(data[0].items, null, 2));
        } else {
            console.log('No orders found.');
        }
    }
    console.log('--- END TEST ---');
}

check();
