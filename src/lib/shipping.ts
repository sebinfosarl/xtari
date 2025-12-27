import { getSettings } from './db';

const API_URL = process.env.CATHEDIS_API_URL || 'https://v1.cathedis.delivery';

export async function loginCathedis() {
    const settings = await getSettings();
    const { username, password } = settings.cathedis;

    if (!username || !password) {
        throw new Error('Cathedis credentials not configured. Please go to Settings to connect your account.');
    }

    const response = await fetch(`${API_URL}/login.jsp`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        throw new Error(`Cathedis login failed: ${response.status} ${response.statusText}`);
    }

    // Get JSESSIONID from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) {
        throw new Error('No session cookie received from Cathedis');
    }

    const jsessionid = setCookie.split(';')[0].split('=')[1];
    return jsessionid;
}

export async function createCathedisDelivery(order: any, jsessionid: string, productSummary?: string) {
    const payload = {
        action: "delivery.api.save",
        data: {
            context: {
                delivery: {
                    // REMOVED id to force creation and avoid invalid ID errors (e.g. sending LD... as internal ID)
                    // id: order.shippingId, 
                    recipient: (order.customer.name || "Client").trim(),
                    city: (order.customer.city || "Casablanca").trim(),
                    sector: (order.customer.sector || "Autre").trim(),
                    phone: (() => {
                        const p = (order.customer.phone || "").replace(/\s/g, '');
                        // If it's a 9 digit number starting with 5, 6, or 7, prepend 0
                        if (p.length === 9 && ['5', '6', '7'].includes(p[0])) {
                            return '0' + p;
                        }
                        // If it's stored with +212, simplify
                        if (p.startsWith('+212')) {
                            return '0' + p.substring(4);
                        }
                        return p || "0600000000"; // Fallback to avoid empty phone error
                    })(),
                    amount: Math.round(order.total).toString(),
                    caution: "0",
                    fragile: order.fragile ? "1" : "0",
                    declaredValue: Math.round(order.insuranceValue || order.total).toString(),
                    address: (order.customer.address || order.customer.city || "A domicile").replace(/[\r\n]+/g, " ").trim().substring(0, 200),
                    // Append timestamp to avoid duplicate reference error if order was previously attempted
                    nomOrder: `${order.id}-${Date.now().toString().slice(-4)}`,
                    comment: "Livraison standard",
                    rangeWeight: order.rangeWeight || "Entre 1.2 Kg et 5 Kg",
                    weight: order.weight?.toString() || "0",
                    width: order.width?.toString() || "0",
                    length: order.length?.toString() || "0",
                    height: order.height?.toString() || "0",
                    subject: productSummary || `Order #${order.id} - ${order.customer.name}`,
                    paymentType: order.paymentType || "ESPECES",
                    deliveryType: order.deliveryType || "Livraison CRBT",
                    packageCount: order.packageCount?.toString() || "1",
                    allowOpening: (order.allowOpening === 1 || order.allowOpening === '1' || order.allowOpening === true) ? "1" : "0"
                }
            }
        }
    };
    console.log('Sending Cathedis Payload:', JSON.stringify(payload, null, 2));
    const response = await fetch(`${API_URL}/ws/action`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie': `JSESSIONID=${jsessionid}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Cathedis API Response:', JSON.stringify(result, null, 2));

    if (result.status !== 0) {
        throw new Error(result.message || 'Failed to create Cathedis delivery');
    }

    // Check if Cathedis returned an error object in data
    if (result.data?.[0]?.error) {
        const errorMsg = result.data[0].error.message || 'Unknown error';
        console.error('Cathedis API returned error in data:', result);
        throw new Error(`Cathedis API Error: ${errorMsg}\n\nOrder ID: ${order.id}\nRaw Response: ${JSON.stringify(result)}\n\nCommon causes:\n- Duplicate Order ID (already shipped)\n- Invalid or missing address\n- Invalid phone number format\n- Invalid city/sector`);
    }

    const deliveryId = result.data?.[0]?.id || result.data?.[0]?.values?.delivery?.id;

    if (!deliveryId) {
        console.error('Cathedis API returned success but no ID:', result);
        throw new Error(`Cathedis API returned success status but failed to provide a delivery ID. \n\nRaw API Response: ${JSON.stringify(result)} \n\nThis usually means a required field (like address) is invalid or the Order ID is a duplicate.`);
    }

    // Debug: Log full response to find sorting code
    console.log('=== CATHEDIS FULL RESPONSE ===');
    console.log(JSON.stringify(result.data[0], null, 2));
    console.log('==============================');

    return result.data[0].values?.delivery || result.data[0];
}


export async function generateCathedisVoucher(deliveryIds: (string | number)[], jsessionid: string) {
    const payload = {
        action: "delivery.print.bl",
        data: {
            context: {
                _ids: deliveryIds,
                _model: "com.tracker.delivery.db.Delivery"
            }
        }
    };

    const response = await fetch(`${API_URL}/ws/action`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie': `JSESSIONID=${jsessionid}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.status === 0 && result.data?.[0]?.view?.views?.[0]?.name) {
        return `${API_URL}/${result.data[0].view.views[0].name}`;
    }
    return null;
}

import { getCitiesFromDB } from '@/lib/db';

export async function getCathedisCities() {
    try {
        const cities = await getCitiesFromDB();
        return cities;
    } catch (e) {
        console.error('getCathedisCities db error', e);
        return [];
    }
}

export async function getCathedisBanks() {
    const response = await fetch(`${API_URL}/ws/public/c2c/bank`, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });

    const result = await response.json();
    return result.status === 0 ? result.data : [];
}


export async function requestCathedisPickup(deliveryIds: number[], pickupPointId: number) {
    const jsessionid = await loginCathedis();
    const payload = {
        action: "action-refresh-pickup-request",
        model: "com.tracker.pickup.db.PickupRequest",
        data: {
            context: {
                ids: deliveryIds,
                pickupPointId: pickupPointId
            }
        }
    };

    console.log('Pickup Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${API_URL}/ws/action`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie': `JSESSIONID=${jsessionid}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Pickup Response:', JSON.stringify(result, null, 2));

    if (result.status !== 0) {
        throw new Error(result.message || 'Failed to request pickup');
    }

    return result;
}
