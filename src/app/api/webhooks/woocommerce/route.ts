import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createOrder, getOrders, getSettings, Order } from '@/lib/db';
import { mapWoocommerceOrderToLocal } from '@/lib/woocommerce';
import { getCathedisCities } from '@/lib/shipping';

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get('x-wc-webhook-signature');
        const body = await req.text(); // Get raw body for signature verification

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        const settings = await getSettings();
        if (!settings.woocommerce || !settings.woocommerce.consumerSecret) {
            // If secret is missing, we can't verify. For now, we proceed or fail.
            // Best to fail if we want security.
        }

        // Signature Verification
        const calculatedSignature = crypto
            .createHmac('sha256', settings.woocommerce?.consumerSecret || '')
            .update(body)
            .digest('base64');

        if (signature !== calculatedSignature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const wcOrder = JSON.parse(body);

        // Handle "ping" or non-order events
        if (!wcOrder.id || !wcOrder.billing) {
            return NextResponse.json({ message: 'Ignored non-order event' }, { status: 200 });
        }

        // De-duplicate
        const existingOrders = await getOrders();
        // ID check
        const isDuplicate = existingOrders.some(o =>
            (o.logs && o.logs.some(l => l.message.includes(`Order #${wcOrder.id})`))) ||
            // Fallback: Date + Total match + Name match (fuzzy)
            (o.date === wcOrder.date_created && parseFloat((wcOrder.total || "0")) === o.total)
        );

        if (isDuplicate) {
            return NextResponse.json({ message: 'Order already exists' }, { status: 200 });
        }

        // Map and Save
        // Fetch valid cities for smart resolution
        let validCities: any[] = [];
        try {
            validCities = await getCathedisCities();
        } catch (e) {
            console.warn('Failed to fetch valid cities for resolution:', e);
        }

        const newOrder: Order = mapWoocommerceOrderToLocal(wcOrder, validCities);
        await createOrder(newOrder);

        return NextResponse.json({
            success: true,
            id: newOrder.id,
            resolvedCity: newOrder.customer.city
        }, { status: 200 });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
