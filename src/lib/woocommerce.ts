
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

export function mapWoocommerceOrderToLocal(wcOrder: WooCommerceOrder): Order {
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
            address: `${wcOrder.shipping.address_1} ${wcOrder.shipping.address_2}`.trim(),
            city: wcOrder.shipping.city,
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
