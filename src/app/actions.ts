'use server';

import {
    getProducts, saveProduct,
    getOrders, updateOrder,
    Order, Product, SalesPerson,
    saveSalesPerson, deleteSalesPerson,
    getUser, createUser, createOrder,
    saveCategory, deleteCategory,
    saveAttribute,
    getBrands, saveBrand, deleteBrand, Brand,
    Attribute,
    deleteAttribute,
    getAttributes,
    deleteProduct,
    getCategories,
    getSuppliers, saveSupplier, deleteSupplier,
    getPurchaseOrders, savePurchaseOrder, deletePurchaseOrder,
    Supplier, PurchaseOrder
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
    redirect('/admin/products');
}

// Attributes Actions
export async function saveAttributeAction(formData: FormData) {
    const id = formData.get('id') as string || Math.random().toString(36).substr(2, 9);
    const name = formData.get('name') as string;
    const values = (formData.get('values') as string).split(',').map(v => v.trim()).filter(Boolean);

    await saveAttribute({
        id,
        name,
        values
    });

    revalidatePath('/admin/products/attributes');
    redirect('/admin/products/attributes');
}

export async function deleteAttributeAction(id: string) {
    await deleteAttribute(id);
    revalidatePath('/admin/products/attributes');
}

// Product Actions
export async function addProductAction(formData: FormData) {
    const dimensions = {
        length: parseFloat(formData.get('length') as string) || 0,
        width: parseFloat(formData.get('width') as string) || 0,
        height: parseFloat(formData.get('height') as string) || 0,
    };

    const attributesRaw = formData.get('attributes') as string;
    const attributes = attributesRaw ? JSON.parse(attributesRaw) : [];

    // Auto-save new attributes to global store
    if (attributes.length > 0) {
        const globalAttributes = await getAttributes();
        for (const attr of attributes) {
            const existing = globalAttributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
            if (existing) {
                // Merge values if new ones are added
                const newValues = attr.values.filter((v: string) => !existing.values.includes(v));
                if (newValues.length > 0) {
                    existing.values = [...existing.values, ...newValues];
                    await saveAttribute(existing);
                }
            } else {
                // Create new attribute
                await saveAttribute({
                    id: Math.random().toString(36).substr(2, 9),
                    name: attr.name,
                    values: attr.values
                });
            }
        }
    }

    const categoryIds = formData.getAll('categoryIds') as string[];
    const gallery = formData.getAll('gallery') as string[];

    const product: Product = {
        id: formData.get('id') as string || Math.random().toString(36).substr(2, 9),
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string),
        salePrice: parseFloat(formData.get('salePrice') as string) || undefined,
        categoryIds: categoryIds,
        image: formData.get('image') as string || 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1',
        gallery: gallery,
        featured: formData.get('featured') === 'on',
        sku: formData.get('sku') as string,
        location: formData.get('location') as string,
        weight: parseFloat(formData.get('weight') as string) || undefined,
        dimensions: dimensions,
        brandId: formData.get('brandId') as string || undefined,
        attributes: attributes,
        linkedProducts: {
            upsells: formData.getAll('upsells') as string[],
            crossSells: formData.getAll('crossSells') as string[],
            frequentlyBoughtTogether: formData.getAll('frequentlyBoughtTogether') as string[],
            similarProducts: formData.getAll('similarProducts') as string[],
        }
    };

    await saveProduct(product);
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/products');
    redirect('/admin/products');
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
    const id = formData.get('id') as string;
    await deleteProduct(id);
    revalidatePath('/admin/products');
}

export async function saveCategoryAction(formData: FormData) {
    const category = {
        id: formData.get('id') as string || Math.random().toString(36).substr(2, 9),
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        parentId: formData.get('parentId') as string || undefined,
    };
    await saveCategory(category);
    revalidatePath('/admin/products/categories');
}

export async function deleteCategoryAction(id: string) {
    await deleteCategory(id);
    revalidatePath('/admin/products/categories');
}

export async function saveBrandAction(formData: FormData) {
    const brand = {
        id: formData.get('id') as string || Math.random().toString(36).substr(2, 9),
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        logo: formData.get('logo') as string || undefined,
    };
    await saveBrand(brand);
    revalidatePath('/admin/products/brands');
}

export async function deleteBrandAction(id: string) {
    await deleteBrand(id);
    revalidatePath('/admin/products/brands');
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

export async function cancelOrderAction(orderId: string) {
    try {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        // Update status
        order.status = 'canceled';

        // Add log entry
        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'status',
            message: 'Order canceled by admin (Pre-shipping).',
            timestamp: new Date().toISOString(),
            user: 'Admin'
        });

        await updateOrder(order);

        revalidatePath('/admin');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/fulfillment');

        return { success: true, order };
    } catch (error: any) {
        console.error('Cancellation failed:', error);
        return { success: false, error: error.message || 'Failed to cancel order' };
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

export async function markDeliveryNotePrintedAction(orderId: string) {
    try {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        order.deliveryNotePrinted = true;

        // Add log entry
        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'print',
            message: 'Delivery note printed.',
            timestamp: new Date().toISOString(),
            user: 'Admin'
        });

        await updateOrder(order);

        revalidatePath('/admin');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/deliveries');

        return { success: true, order: JSON.parse(JSON.stringify(order)) };
    } catch (error: any) {
        console.error('Failed to mark delivery note as printed:', error);
        return { success: false, error: error.message || 'Failed to update print status' };
    }
}

export async function bulkMarkDeliveryNotePrintedAction(orderIds: string[]) {
    try {
        const orders = await getOrders();
        let updatedCount = 0;

        for (const orderId of orderIds) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                order.deliveryNotePrinted = true;
                if (!order.logs) order.logs = [];
                order.logs.push({
                    type: 'print',
                    message: 'Delivery note printed (Bulk).',
                    timestamp: new Date().toISOString(),
                    user: 'Admin'
                });
                await updateOrder(order);
                updatedCount++;
            }
        }

        revalidatePath('/admin');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/fulfillment');

        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error('Failed to mark delivery notes as printed in bulk:', error);
        return { success: false, error: error.message || 'Failed to update print status' };
    }
}

export async function reorderCategoriesAction(items: { id: string; order: number }[]) {
    const categories = await getCategories();

    for (const item of items) {
        const category = categories.find(c => c.id === item.id);
        if (category) {
            category.order = item.order;
            await saveCategory(category);
        }
    }

    revalidatePath('/admin/products/categories');
}

// Purchase Order Actions
export async function savePurchaseOrderAction(po: PurchaseOrder) {
    await savePurchaseOrder(po);
    revalidatePath('/admin/purchase');
    return { success: true };
}

export async function deletePurchaseOrderAction(id: string) {
    await deletePurchaseOrder(id);
    revalidatePath('/admin/purchase');
    return { success: true };
}

// Supplier Actions
export async function saveSupplierAction(supplier: Supplier) {
    await saveSupplier(supplier);
    revalidatePath('/admin/purchase');
    return { success: true };
}

export async function deleteSupplierAction(id: string) {
    await deleteSupplier(id);
    revalidatePath('/admin/purchase');
    return { success: true };
}
