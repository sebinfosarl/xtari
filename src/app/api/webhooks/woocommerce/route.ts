import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createOrder, getOrders, getSettings, Order } from '@/lib/db';
import { mapWoocommerceOrderToLocal } from '@/lib/woocommerce';

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get('x-wc-webhook-signature');
        const body = await req.text(); // Get raw body for signature verification

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        const settings = await getSettings();
        if (!settings.woocommerce || !settings.woocommerce.consumerSecret) { // Note: Ideally use a specific Webhook Secret, but Consumer Secret is often used or a separate field
            // If we want a separate field for webhook secret, we'd add it to settings. 
            // For now, let's assume the user might reuse consumer secret or we should verify if WC uses a specific key.
            // WC Webhooks have a specific "Secret" field you set when creating the hook. 
            // IMPORTANT: We need to tell the user to set this "Secret" in our settings or use the Consumer Secret.
            // Let's use Consumer Secret as a fallback or assume they pasted it into a new field?
            // Actually, usually it's a specific secret. Let's assume Consumer Secret for now to simplify, OR just check validity if we can.
            // Standard practice: User sets a secret in WC, and pastes the SAME secret in our App.
            // Since we don't have a "Webhook Secret" field, let's try to verify with Consumer Secret, OR simpler: 
            // allow the user to just use the integration. 
            // Re-reading plan: I didn't add a Webhook Secret field. 
            // VALIDATION: simpler to check signature against Consumer Secret if that's what they used, 
            // but correct way is a specific key.

            // Let's verify using the Consumer Secret for MVP simplicity, assume user sets that as the secret in WC.
        }

        // However, for strict correctness, we should verify the signature:
        // Signature = HMAC-SHA256(payload, secret).base64
        const calculatedSignature = crypto
            .createHmac('sha256', settings.woocommerce?.consumerSecret || '')
            .update(body)
            .digest('base64');

        if (signature !== calculatedSignature) {
            // If they are different, maybe they used the Consumer Key? Or a different secret.
            // For MVP, we can log a warning but maybe proceed or fail?
            // Security-wise, fail.
            // BUT: UX-wise, if they didn't know to copy the secret, it fails.
            // Let's enforce it.
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
        const newOrder: Order = mapWoocommerceOrderToLocal(wcOrder);
        await createOrder(newOrder);

        return NextResponse.json({ success: true, id: newOrder.id }, { status: 200 });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
