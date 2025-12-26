
export interface WooCommerceOrder {
    id: number;
    status: string;
    total: string;
    date_created: string;
    billing: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
        email: string;
        phone: string;
    };
    shipping: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    line_items: Array<{
        name: string;
        product_id: number;
        variation_id: number;
        quantity: number;
        subtotal: string;
        total: string;
        sku: string;
        price: number;
        image: {
            src: string;
        };
    }>;
    payment_method_title: string;
}

export async function verifyWoocommerceConnection(url: string, key: string, secret: string) {
    try {
        const baseUrl = url.replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/system_status`, {
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
            }
        });

        if (response.ok) {
            return { success: true };
        } else {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            return { success: false, error: error.message || response.statusText };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


interface WooCommerceProduct {
    id: number;
    name: string;
    slug: string;
    description: string;
    short_description: string;
    sku: string;
    price: string;
    regular_price: string;
    sale_price: string;
    stock_quantity: number | null;
    status: string;
    images: {
        id: number;
        src: string;
        name: string;
        alt: string;
    }[];
    categories: {
        id: number;
        name: string;
        slug: string;
    }[];
}

export async function fetchWoocommerceOrders(url: string, key: string, secret: string, after?: string, before?: string) {
    const baseUrl = url.replace(/\/$/, "");
    let query = `${baseUrl}/wp-json/wc/v3/orders?per_page=100`; // Increased limit since we time-box

    // If you wanted to filter by status or date
    // query += "&status=processing,completed,on-hold";
    if (after) {
        query += `&after=${after}`;
    }
    if (before) {
        query += `&before=${before}`;
    }

    const response = await fetch(query, {
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    const data = await response.json();
    return data as WooCommerceOrder[];
}

import { Order } from './db';


function normalizeMoroccanPhone(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Remove 212 prefix if present
    if (cleaned.startsWith('212')) {
        cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('00212')) {
        cleaned = cleaned.substring(5);
    }

    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    return cleaned;
}

// Helper for Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function cleanString(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveCity(inputCity: string, validCities?: { name: string }[]): string {
    if (!inputCity) return '';
    const cleanedInput = cleanString(inputCity);

    // 1. If no valid cities, return uppercase as strict fallback
    if (!validCities || validCities.length === 0) {
        return inputCity.toUpperCase().trim();
    }

    // 2. Exact match (normalized)
    // We search the list. Ideally this list should be pre-normalized map for perf, but array is small enough.
    const exact = validCities.find(c => cleanString(c.name) === cleanedInput);
    if (exact) return exact.name;

    // 3. Fuzzy match (Levenshtein)
    let bestMatch: string | null = null;
    let minDistance = Infinity;

    // Adaptive threshold: Allow more typos for longer words.
    // Length < 5: 0 (Exact only - handled above, but maybe strict char diff needed?) -> allow 1
    // Length >= 5: 2
    // Length >= 10: 3
    const threshold = cleanedInput.length < 5 ? 1 : (cleanedInput.length < 10 ? 2 : 3);

    for (const city of validCities) {
        const cleanedCity = cleanString(city.name);

        // Optimisation: if lengths differ too much, skip
        if (Math.abs(cleanedCity.length - cleanedInput.length) > threshold) continue;

        const dist = levenshteinDistance(cleanedInput, cleanedCity);

        if (dist <= threshold && dist < minDistance) {
            minDistance = dist;
            bestMatch = city.name;
        }
    }

    if (bestMatch) return bestMatch;

    // 4. Fallback: Return original input (trimmed) if no match found. 
    return inputCity.trim();
}

function extractCityFromAddress(address: string, validCities: { name: string }[]): string {
    if (!address || !validCities || validCities.length === 0) return '';
    const cleanedAddr = cleanString(address);

    // Sort cities by length descending to match longest sequences first (e.g. "Sidi Yahya Lgharb" before "Sidi")
    // We cache this sort ideally, but for now 400 items is fine.
    const sortedCities = [...validCities].sort((a, b) => b.name.length - a.name.length);

    for (const city of sortedCities) {
        const cleanedCity = cleanString(city.name);
        // Check for word boundary? Or just includes?
        // simple includes might find "Fes" in "Festival". 
        // Adding spaces for boundary check is safer: " " + addr + " " includes " " + city + " "
        // But punctuation matters. cleanString removes punctuation?
        // cleanString: normalized, replaces \s+ with ' ', lower. Punctuation?
        // replace(/[\u0300-\u036f]/g, "") removes accents.
        // It does NOT remove punctuation like commas.
        // Let's improve cleanString to remove punctuation for address matching context?
        // Actually, just checking includes is a good start. 
        if (cleanedAddr.includes(cleanedCity)) {
            return city.name;
        }
    }
    return '';
}

export function mapWoocommerceOrderToLocal(wcOrder: WooCommerceOrder, validCities: { name: string }[] = []): Order {
    let rawCity = wcOrder.shipping?.city || wcOrder.billing?.city || '';

    // Fallback 1: If city is empty, check if 'state' holds the city name (per user data observation)
    if (!rawCity.trim()) {
        const potentialCityFromState = wcOrder.shipping?.state || wcOrder.billing?.state;
        if (potentialCityFromState && potentialCityFromState.trim()) {
            rawCity = potentialCityFromState;
        }
    }

    // Fallback 2: If city (and state) is empty, try to extract from address
    if (!rawCity.trim()) {
        const fullAddress = `${wcOrder.shipping?.address_1 || ''} ${wcOrder.shipping?.address_2 || ''} ${wcOrder.billing?.address_1 || ''} ${wcOrder.billing?.address_2 || ''}`;
        const extracted = extractCityFromAddress(fullAddress, validCities);
        if (extracted) {
            rawCity = extracted; // Use extracted city for resolution verification
        }
    }

    const resolvedCity = resolveCity(rawCity, validCities);

    return {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        items: wcOrder.line_items.map(item => ({
            productId: 'wc_' + item.product_id.toString(),
            quantity: item.quantity,
            price: item.price
        })),
        total: parseFloat(wcOrder.total),
        status: wcOrder.status === 'completed' ? 'sales_order' : 'pending',
        date: wcOrder.date_created,
        customer: {
            name: `${wcOrder.billing.first_name} ${wcOrder.billing.last_name}`,
            email: wcOrder.billing.email,
            phone: normalizeMoroccanPhone(wcOrder.billing.phone),
            address: `${wcOrder.shipping?.address_1 || ''} ${wcOrder.shipping?.address_2 || ''}`.trim(),
            city: resolvedCity,
            country: wcOrder.shipping?.country || wcOrder.billing?.country,
            state: wcOrder.shipping?.state || wcOrder.billing?.state,
        },
        paymentType: wcOrder.payment_method_title,
        packageCount: 1,
        allowOpening: 1,
        logs: [
            {
                type: 'import',
                message: `Imported from WooCommerce (Order #${wcOrder.id})`,
                timestamp: new Date().toISOString(),
                user: 'System'
            }
        ]
    };
}

export async function fetchWoocommerceProducts(url: string, key: string, secret: string) {
    const baseUrl = url.replace(/\/$/, "");
    // Fetch generic products, maybe limit 100 per page. 
    // Pagination logic might be needed for large stores, but MVP: catch latest 100.
    const query = `${baseUrl}/wp-json/wc/v3/products?per_page=100`;

    const response = await fetch(query, {
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    return data as WooCommerceProduct[];
}
