const crypto = require('crypto');
const http = require('http');

// --- CONFIGURATION ---
const PORT = 3000;
const PATH = '/api/webhooks/woocommerce';
// IMPORTANT: This must match the 'Consumer Secret' in your App Settings > Integrations > WooCommerce
const CONSUMER_SECRET = process.argv[2] || 'YOUR_CONSUMER_SECRET_HERE';

const payload = {
    "id": Math.floor(Math.random() * 10000), // Random ID to avoid duplicates
    "parent_id": 0,
    "status": "processing",
    "currency": "MAD",
    "version": "8.5.1",
    "prices_include_tax": false,
    "date_created": new Date().toISOString().slice(0, 19),
    "date_modified": new Date().toISOString().slice(0, 19),
    "discount_total": "0.00",
    "discount_tax": "0.00",
    "shipping_total": "25.00",
    "shipping_tax": "0.00",
    "cart_tax": "0.00",
    "total": "475.00",
    "total_tax": "0.00",
    "billing": {
        "first_name": "Test",
        "last_name": "Phone Fix",
        "company": "",
        "address_1": "123 Test St",
        "address_2": "",
        "city": "Casablanca",
        "state": "",
        "postcode": "20000",
        "country": "MA",
        "email": "test.phone@example.com",
        "phone": "+212661753535"  // THE TARGET PHONE NUMBER TO TEST
    },
    "shipping": {
        "first_name": "Test",
        "last_name": "Phone Fix",
        "company": "",
        "address_1": "123 Test St",
        "address_2": "",
        "city": "Casablanca",
        "state": "",
        "postcode": "20000",
        "country": "MA"
    },
    "payment_method": "cod",
    "payment_method_title": "Cash on Delivery",
    "transaction_id": "",
    "client_details": {
        "ip_address": "127.0.0.1",
        "user_agent": "Simulation Script"
    },
    "line_items": [
        {
            "id": 101,
            "name": "Test Product",
            "product_id": 999,
            "variation_id": 0,
            "quantity": 1,
            "tax_class": "",
            "subtotal": "450.00",
            "subtotal_tax": "0.00",
            "total": "450.00",
            "total_tax": "0.00",
            "taxes": [],
            "meta_data": [],
            "sku": "TEST-SKU",
            "price": 450,
            "image": {
                "id": 0,
                "src": ""
            },
            "parent_name": null
        }
    ],
    "tax_lines": [],
    "shipping_lines": [
        {
            "id": 102,
            "method_title": "Standard",
            "method_id": "flat_rate",
            "instance_id": "1",
            "total": "25.00",
            "total_tax": "0.00",
            "taxes": [],
            "meta_data": []
        }
    ],
    "fee_lines": [],
    "coupon_lines": [],
    "refunds": [],
    "currency_symbol": "dh"
};

const body = JSON.stringify(payload);

// Calculate Signature
const signature = crypto
    .createHmac('sha256', CONSUMER_SECRET)
    .update(body)
    .digest('base64');

console.log('--- Simulating WooCommerce Webhook ---');
console.log(`Target: http://localhost:${PORT}${PATH}`);
console.log('Secret Used:', CONSUMER_SECRET);
console.log('Sending Phone:', payload.billing.phone);

const options = {
    hostname: 'localhost',
    port: PORT,
    path: PATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-wc-webhook-signature': signature,
        'x-wc-webhook-topic': 'order.created',
        'x-wc-webhook-source': 'localhost-simulation',
        'x-wc-webhook-id': 'sim_123'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(body);
req.end();
