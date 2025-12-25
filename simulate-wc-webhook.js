const fetch = require('node-fetch');
const crypto = require('crypto');

// --- CONFIGURATION ---
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/woocommerce';
// IMPORTANT: This must match the 'Consumer Secret' in your App Settings > Integrations > WooCommerce
// If you haven't set one, go to the app, set a dummy secret like "cs_123", save it, and put it here.
const CONSUMER_SECRET = process.argv[2] || 'YOUR_CONSUMER_SECRET_HERE';

const payload = {
    "id": 7842,
    "parent_id": 0,
    "status": "processing",
    "currency": "MAD",
    "version": "8.5.1",
    "prices_include_tax": false,
    "date_created": new Date().toISOString().slice(0, 19), // Use current time
    "date_modified": new Date().toISOString().slice(0, 19),
    "discount_total": "0.00",
    "discount_tax": "0.00",
    "shipping_total": "25.00",
    "shipping_tax": "0.00",
    "cart_tax": "0.00",
    "total": "475.00",
    "total_tax": "0.00",
    "billing": {
        "first_name": "Amine",
        "last_name": "Benjelloun",
        "company": "",
        "address_1": "123 Rue de la Liberté",
        "address_2": "Apt 4, 2ème étage",
        "city": "Casablanca",
        "state": "",
        "postcode": "20250",
        "country": "MA",
        "email": "amine.benj@example.com",
        "phone": "0661123456"
    },
    "shipping": {
        "first_name": "Amine",
        "last_name": "Benjelloun",
        "company": "",
        "address_1": "123 Rue de la Liberté",
        "address_2": "Apt 4, 2ème étage",
        "city": "Casablanca",
        "state": "",
        "postcode": "20250",
        "country": "MA"
    },
    "payment_method": "cod",
    "payment_method_title": "Cash on Delivery",
    "transaction_id": "",
    "customer_ip_address": "196.12.34.56",
    "customer_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "created_via": "checkout",
    "customer_note": "Please call before delivery",
    "date_completed": null,
    "date_paid": null,
    "cart_hash": "a1b2c3d4e5f6...",
    "number": "7842",
    "meta_data": [],
    "line_items": [
        {
            "id": 345,
            "name": "Wireless Bluetooth Headphones",
            "product_id": 105,
            "variation_id": 0,
            "quantity": 1,
            "tax_class": "",
            "subtotal": "300.00",
            "subtotal_tax": "0.00",
            "total": "300.00",
            "total_tax": "0.00",
            "taxes": [],
            "meta_data": [],
            "sku": "HEAD-BT-001",
            "price": 300,
            "image": {
                "id": 1050,
                "src": "https://placehold.co/600x400"
            },
            "parent_name": null
        },
        {
            "id": 346,
            "name": "Phone Case - Black",
            "product_id": 88,
            "variation_id": 0,
            "quantity": 1,
            "tax_class": "",
            "subtotal": "150.00",
            "subtotal_tax": "0.00",
            "total": "150.00",
            "total_tax": "0.00",
            "taxes": [],
            "meta_data": [],
            "sku": "CASE-BLK-009",
            "price": 150,
            "image": {
                "id": 880,
                "src": "https://placehold.co/600x400"
            },
            "parent_name": null
        }
    ],
    "tax_lines": [],
    "shipping_lines": [
        {
            "id": 347,
            "method_title": "Standard Delivery",
            "method_id": "flat_rate",
            "instance_id": "2",
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
console.log('Target URL:', WEBHOOK_URL);
console.log('Secret Used:', CONSUMER_SECRET);
console.log('Signature:', signature);

fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-wc-webhook-signature': signature,
        'x-wc-webhook-topic': 'order.created',
        'x-wc-webhook-source': 'localhost-simulation',
        'x-wc-webhook-id': 'sim_123'
    },
    body: body
})
    .then(async res => {
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    })
    .catch(err => console.error('Error:', err));
