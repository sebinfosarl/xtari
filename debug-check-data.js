
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
    console.log('--- CHECKING DATA ---');
    // Get latest order
    const { data: orders } = await supabase.from('Order').select('*').order('date', { ascending: false }).limit(1);

    if (!orders || orders.length === 0) {
        console.log('No orders found.');
        return;
    }

    const latestOrder = orders[0];
    console.log(`Latest Order: ${latestOrder.id} (${new Date(latestOrder.date).toLocaleString()})`);

    // Check items for this order
    const { data: items, error } = await supabase.from('OrderItem').select('*').eq('order_id', latestOrder.id);

    if (error) {
        console.log('Error fetching items:', error.message);
    } else {
        console.log(`Items found for order ${latestOrder.id}: ${items.length}`);
        if (items.length > 0) {
            console.log('Item 0:', items[0]);
        } else {
            // Check if maybe they are under camelCase ID?? Unlikely if schema is snake_case
            // Let's check ALL items just to be sure
            const { count } = await supabase.from('OrderItem').select('*', { count: 'exact', head: true });
            console.log(`Total OrderItems in DB: ${count}`);
        }
    }
    console.log('--- END CHECK ---');
}

check();
