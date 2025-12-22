'use server';

import {
    getProducts, saveProduct,
    getOrders, updateOrder,
    Order, Product, SalesPerson,
    saveSalesPerson, deleteSalesPerson,
    getUser, createUser, createOrder
} from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginCathedis, createCathedisDelivery, generateCathedisVoucher, getCathedisCities, getCathedisBanks } from '@/lib/shipping';

export async function adminLoginAction(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const user = await getUser(username);

    if (user && user.password === password) {
        const cookieStore = await cookies();
        cookieStore.set('auth_token', 'secret_token_123', { httpOnly: true, secure: true });
        redirect('/admin');
    }
}

export async function adminSignupAction(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirm = formData.get('confirmPassword') as string;

    if (password !== confirm) {
        // Simple error handling for now - ideally we'd show a toast or error
        return;
    }

    try {
        await createUser({ username, password });
    } catch (e) {
        console.error("Signup failed", e);
        return;
    }

    // Auto login after signup? Or redirect to login. Let's redirect to login for simplicity
    redirect('/login');
}

export async function addProductAction(formData: FormData) {
    const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string),
        category: formData.get('category') as string,
        image: formData.get('image') as string || 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1',
        featured: formData.get('featured') === 'on'
    };

    await saveProduct(product);
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/products');
}

export async function createOrderAction(formData: FormData) {
    const rawItems = formData.get('items') as string;
    const items = JSON.parse(rawItems);

    const order: Order = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        items: items,
        total: parseFloat(formData.get('total') as string),
        status: 'pending',
        date: new Date().toISOString(),
        customer: {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            city: formData.get('city') as string,
            sector: formData.get('sector') as string,
        },
        salesPerson: formData.get('salesPerson') as string || undefined,
        allowOpening: 1, // Yes by default
        packageCount: 1, // 1 by default
    };

    await createOrder(order);
    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    return { success: true };
}

export async function updateOrderAction(order: Order) {
    await updateOrder(order);
    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    return { success: true };
}

export async function saveSalesPersonAction(salesPerson: SalesPerson) {
    await saveSalesPerson(salesPerson);
    revalidatePath('/admin/sales');
}

export async function deleteSalesPersonAction(id: string) {
    await deleteSalesPerson(id);
    revalidatePath('/admin/sales');
}

export async function deleteProductAction(formData: FormData) {
    // In a real app we would delete from DB. 
    // Since we are using a simple append-only JSON logic in db.ts for this demo, 
    // we will simulate it or add a delete function to db.ts first.
    // For now, let's just revalidate.
    console.log("Delete product requested for", formData.get('id'));
    revalidatePath('/admin/products');
}

// Shipping Actions
export async function createShipmentAction(order: Order) {
    try {
        const isUpdate = !!order.shippingId;
        console.log(`${isUpdate ? 'Updating' : 'Starting'} shipment for order ${order.id}...`);

        // Login to Cathedis
        const jsessionid = await loginCathedis();

        // Create delivery
        console.log(`Sending delivery request to Cathedis for ${order.customer.name} in ${order.customer.city}...`);

        // Fetch products to get titles for the "merchandise" field
        const products = await getProducts();
        const productSummary = order.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return `${product?.title || 'Product'} (x${item.quantity})`;
        }).join(', ');

        const delivery = await createCathedisDelivery(order, jsessionid, productSummary);

        if (!delivery?.id) {
            console.error('Delivery created but ID is missing:', delivery);
            return { success: false, error: 'Cathedis API failed to return a delivery ID. The shipment was likely not created.' };
        }

        console.log(`Delivery created successfully. Cathedis ID: ${delivery.id}`);

        // Update order with shipping info IMMEDIATELY after creation
        order.shippingId = delivery.id?.toString();
        order.shippingStatus = delivery.deliveryStatus || 'En Attente Ramassage';

        // Add log entry
        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'shipping',
            message: `Shipment created with Cathedis. ID: ${order.shippingId}`,
            timestamp: new Date().toISOString(),
            user: 'System'
        });

        // Save immediately so we don't lose the ID if label generation fails
        await updateOrder(order);
        console.log(`Order ${order.id} updated with shipping ID ${order.shippingId}`);

        // Voucher generation removed to speed up the process. 
        // It's not currently used in the UI, and creates a significant delay.
        // If needed later, implement as a separate async action or on-demand.

        revalidatePath('/admin');
        revalidatePath(`/admin/orders`);
        return { success: true, order: JSON.parse(JSON.stringify(order)) };
    } catch (error: any) {
        console.error('Shipment creation failed:', error);
        return { success: false, error: error.message || 'Failed to create shipment' };
    }
}


export async function getCathedisCitiesAction() {
    try {
        return await getCathedisCities();
    } catch (error) {
        console.error('Failed to fetch cities:', error);
        return [];
    }
}

export async function getCathedisBanksAction() {
    try {
        return await getCathedisBanks();
    } catch (error) {
        console.error('Failed to fetch banks:', error);
        return [];
    }
}

export async function cancelShipmentAction(orderId: string) {
    try {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        // Update status
        order.status = 'canceled';
        order.shippingStatus = 'ANNULÉE';

        // Add log entry
        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'status',
            message: 'Order and Shipment canceled by admin.',
            timestamp: new Date().toISOString(),
            user: 'Admin'
        });

        await updateOrder(order);

        revalidatePath('/admin');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/deliveries');

        return { success: true, order };
    } catch (error: any) {
        console.error('Cancellation failed:', error);
        return { success: false, error: error.message || 'Failed to cancel shipment' };
    }
}

export async function bulkPrintVouchersAction(orderIds: string[]) {
    try {
        const orders = await getOrders();
        const shippingIds = orders
            .filter(o => orderIds.includes(o.id) && o.shippingId)
            .map(o => o.shippingId as string);

        if (shippingIds.length === 0) {
            return { success: false, error: 'No shipped orders found in selection.' };
        }

        const jsessionid = await loginCathedis();
        const voucherUrl = await generateCathedisVoucher(shippingIds, jsessionid);

        if (voucherUrl) {
            return { success: true, url: voucherUrl };
        } else {
            return { success: false, error: 'Failed to generate combined voucher.' };
        }
    } catch (error: any) {
        console.error('Bulk voucher generation failed:', error);
        return { success: false, error: error.message };
    }
}
