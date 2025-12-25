
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
    console.log('--- START DEBUG V2 ---');

    // 1. Get an order
    const { data: orders } = await supabase.from('Order').select('id').limit(1);
    if (!orders || orders.length === 0) { console.log('No orders to test with.'); return; }
    const orderId = orders[0].id;

    // 2. Get a product
    const { data: products } = await supabase.from('Product').select('id').limit(1);
    if (!products || products.length === 0) { console.log('No products to test with.'); return; }
    const productId = products[0].id;

    console.log('Testing with Order:', orderId, 'Product:', productId);

    // 3. Test Insert with camelCase
    const payloadCamel = {
        orderId: orderId,
        productId: productId,
        quantity: 1,
        price: 123
    };

    console.log('Trying camelCase insert...');
    const { data: d1, error: e1 } = await supabase.from('OrderItem').insert(payloadCamel).select();
    if (e1) {
        console.log('camelCase Failed:', e1.message);
    } else {
        console.log('camelCase Success!', d1);
        // Clean up
        if (d1 && d1.length > 0) {
            // Need to know PK to delete? Usually composite PK or just delete by params
            await supabase.from('OrderItem').delete().eq('orderId', orderId).eq('productId', productId);
        }
        return; // Found it
    }

    // 4. Test Insert with snake_case
    const payloadSnake = {
        order_id: orderId,
        product_id: productId,
        quantity: 1,
        price: 123
    };

    console.log('Trying snake_case insert...');
    const { data: d2, error: e2 } = await supabase.from('OrderItem').insert(payloadSnake).select();
    if (e2) {
        console.log('snake_case Failed:', e2.message);
    } else {
        console.log('snake_case Success!', d2);
    }

    console.log('--- END DEBUG V2 ---');
}

check();
