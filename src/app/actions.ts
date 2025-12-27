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
    Supplier, PurchaseOrder,
    getKits, saveKit, deleteKit, Kit,
    updateProductStatus,
    getSettings, saveSettings
} from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginCathedis, createCathedisDelivery, generateCathedisVoucher, getCathedisCities, getCathedisBanks } from '@/lib/shipping';
import { fetchWoocommerceOrders, fetchWoocommerceProducts, verifyWoocommerceConnection, mapWoocommerceOrderToLocal } from '@/lib/woocommerce';

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
export async function updateProductStatusAction(id: string, status: 'live' | 'draft' | 'archived') {
    await updateProductStatus(id, status);
    revalidatePath('/admin');
    revalidatePath('/admin/products');
}

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
        id: (formData.get('id') as string) || `prod_${Date.now()}`,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string),
        salePrice: formData.get('salePrice') ? parseFloat(formData.get('salePrice') as string) : undefined,
        categoryIds: categoryIds,
        image: formData.get('image') as string || '/default-product.jpg', // Use fallback image
        gallery: gallery,
        featured: formData.get('featured') === 'on',
        isVisible: formData.get('isHidden') !== 'on', // Inverted logic: if hidden is checked (on), visible is false
        sku: formData.get('sku') as string,
        stock: parseInt(formData.get('stock') as string) || 0, // Handle stock
        location: formData.get('location') as string,
        weight: parseFloat(formData.get('weight') as string) || 0,
        dimensions: dimensions,
        brandId: formData.get('brandId') as string || undefined,
        attributes: JSON.parse(formData.get('attributes') as string || '[]'),
        linkedProducts: {
            upsells: formData.getAll('upsells') as string[],
            crossSells: formData.getAll('crossSells') as string[],
            frequentlyBoughtTogether: formData.getAll('frequentlyBoughtTogether') as string[],
            similarProducts: formData.getAll('similarProducts') as string[],
        },
        status: (formData.get('status') as 'live' | 'draft' | 'archived') || 'live',
    };

    await saveProduct(product);
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/products');
    redirect('/admin/products');
}

export async function createOrderAction(formData: FormData) {
    const rawItems = formData.get('items') as string;
    let items = JSON.parse(rawItems);

    // Kit Expansion Logic
    const kits = await getKits();
    if (kits.length > 0) {
        const products = await getProducts();
        const expandedItems: any[] = [];

        for (const item of items) {
            const kit = kits.find(k => k.targetProductId === item.productId);
            if (kit) {
                // Calculate how many kits are ordered relative to the output quantity
                // e.g. Kit makes 1 unit. User ordered 5 units. Factor = 5 / 1 = 5.
                // e.g. Kit makes 10 units. User ordered 20 units. Factor = 2.
                // We use Math.ceil to ensure we have enough components if it doesn't divide evenly, 
                // or just simple division if we treat it as continuous. 
                // Given physical items, usually it's integer multiples of the kit "output".
                // But if the user sells "100ml Ink" (Output=1) and "Kit" has "1 Liter Bottle" (Component),
                // it might be tricky.
                // Assuming "Output Quantity" is 1 for most simple bundles.

                const ratio = item.quantity / (kit.outputQuantity || 1);

                for (const comp of kit.components) {
                    const compProduct = products.find(p => p.id === comp.productId);
                    const qtyNeeded = comp.quantity * ratio;

                    // Check if we already have this component in our expanded list (merge)
                    const existingIndex = expandedItems.findIndex(ei => ei.productId === comp.productId);
                    if (existingIndex >= 0) {
                        expandedItems[existingIndex].quantity += qtyNeeded;
                    } else {
                        expandedItems.push({
                            productId: comp.productId,
                            quantity: qtyNeeded,
                            price: compProduct?.price || 0 // Use catalogue price for component
                        });
                    }
                }
            } else {
                expandedItems.push(item);
            }
        }
        items = expandedItems;
    }

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
        weight: 1, // 1 kg by default
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
        order.deliveryNotePrinted = false; // Reset printed status on update/creation

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

export async function reorderCategoriesAction(items: { id: string; order: number; parentId?: string }[]) {
    const categories = await getCategories();

    for (const item of items) {
        const category = categories.find(c => c.id === item.id);
        if (category) {
            category.order = item.order;
            // Only update parentId if it's provided in the update object (undefined/null might mean root, so careful check)
            // But here we're passing the full snapshot of parentId, so we should allow setting it.
            // If item has parentId property, we update it.
            if ('parentId' in item) {
                category.parentId = item.parentId;
            }
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

export async function returnOrderAction(orderId: string) {
    try {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        order.fulfillmentStatus = 'returned';
        order.status = 'canceled'; // User request: Cancel order when returned

        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'status',
            message: 'Order marked as Returned.',
            timestamp: new Date().toISOString(),
            user: 'Admin'
        });

        await updateOrder(order);

        revalidatePath('/admin');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/fulfillment');

        return { success: true, order };
    } catch (error: any) {
        console.error('Return failed:', error);
        return { success: false, error: error.message || 'Failed to return order' };
    }
}

export async function restoreOrderToShipmentAction(orderId: string) {
    try {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        // Restore to 'picked' which is the status for "Deliveries" / "Shipment"
        order.fulfillmentStatus = 'picked';

        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'status',
            message: 'Order restored to Shipment (Deliveries).',
            timestamp: new Date().toISOString(),
            user: 'Admin'
        });

        await updateOrder(order);

        revalidatePath('/admin');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/fulfillment');

        return { success: true, order };
    } catch (error: any) {
        console.error('Restore failed:', error);
        return { success: false, error: error.message || 'Failed to restore order' };
    }
}

import { requestCathedisPickup } from '@/lib/shipping';

export async function requestPickupAction(orderIds: string[], pickupPointId: number) {
    try {
        const orders = await getOrders();
        const ordersToRequest = orders.filter(o => orderIds.includes(o.id));

        if (ordersToRequest.length === 0) {
            return { success: false, error: 'No orders found' };
        }

        const deliveryIds = ordersToRequest
            .filter(o => o.shippingId)
            .map(o => parseInt(o.shippingId!));

        if (deliveryIds.length === 0) {
            return { success: false, error: 'No valid shipping IDs found in selection' };
        }

        const result = await requestCathedisPickup(deliveryIds, pickupPointId);

        // Update local statuses
        let updatedCount = 0;

        // Resolve City Name / Location Label
        let cityName = 'Unknown Location';

        // 1. Try hardcoded defaults first (legacy)
        if (pickupPointId === 26301) cityName = 'Rabat';
        else if (pickupPointId === 36407) cityName = 'Tanger';
        else if (pickupPointId === 0) cityName = 'Bureau';

        // 2. Try dynamic settings (override)
        try {
            const settings = await getSettings();
            if (settings.pickupLocations) {
                const locations = settings.pickupLocations.split('\n')
                    .map(line => {
                        const parts = line.split(/[-:]/);
                        const id = parseInt(parts[parts.length - 1]?.trim());
                        const label = parts.slice(0, parts.length - 1).join('-').trim();
                        return { id, label };
                    });
                const match = locations.find(l => l.id === pickupPointId);
                if (match && match.label) {
                    cityName = match.label;
                }
            }
        } catch (e) {
            console.error('Failed to resolve dynamic pickup location name', e);
        }

        const newStatus = `Pickup: ${cityName}`;

        for (const order of ordersToRequest) {
            if (order.shippingId) {
                order.shippingStatus = newStatus;
                if (!order.logs) order.logs = [];
                order.logs.push({
                    type: 'shipping',
                    message: `Pickup requested at ${cityName} (ID: ${pickupPointId})`,
                    timestamp: new Date().toISOString(),
                    user: 'Admin'
                });
                await updateOrder(order);
                updatedCount++;
            }
        }

        revalidatePath('/admin/fulfillment');
        return { success: true, count: updatedCount };

    } catch (error: any) {
        console.error('Pickup request failed:', error);
        return { success: false, error: error.message || 'Failed to request pickup' };
    }
}

export async function markOrderAsDeliveredAction(orderId: string, deliveryNoteName: string = 'PDF Scan') {
    try {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId || o.shippingId === orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        order.shippingStatus = 'Livré (Via PDF Scan)';

        if (!order.logs) order.logs = [];
        order.logs.push({
            type: 'shipping',
            message: `Marked as Delivered based on document analysis: ${deliveryNoteName}`,
            timestamp: new Date().toISOString(),
            user: 'System'
        });

        await updateOrder(order);
        revalidatePath('/admin/fulfillment');

        return { success: true, orderName: order.customer.name, orderId: order.id };
    } catch (error: any) {
        console.error('Marking as delivered failed:', error);
        return { success: false, error: error.message };
    }
}

// Kit Actions
export async function saveKitAction(kit: Kit) {
    await saveKit(kit);
    revalidatePath('/admin/products/kits');
    return { success: true };
}

export async function deleteKitAction(id: string) {
    await deleteKit(id);
    revalidatePath('/admin/products/kits');
    return { success: true };
}

// Stub for refreshing shipment status to prevent build errors
export async function refreshShipmentStatusAction() {
    return { success: false, error: 'Not implemented' };
}

// Settings Actions
export async function getCathedisSettingsAction() {
    const settings = await getSettings();
    return {
        username: settings.cathedis?.username || '',
        // Don't modify the password logic here. If it's saved, we might want to return a placeholder or empty
        // returning empty means input will be empty.
        isConnected: settings.cathedis?.isConnected || false,
        pickupLocations: settings.pickupLocations || ''
    };
}


export async function saveCathedisSettingsAction(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
    }

    try {
        const settings = await getSettings();

        // 1. Save credentials temporarily
        settings.cathedis = {
            username,
            password,
            isConnected: false
        };
        await saveSettings(settings);

        // 2. Verify by attempting to login
        try {
            await loginCathedis();
        } catch (loginError: any) {
            return { success: false, error: 'Invalid credentials or connection failed. Please check your username and password.' };
        }

        // 3. Login successful - mark as connected
        settings.cathedis.isConnected = true;
        await saveSettings(settings);

        revalidatePath('/admin/settings');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function disconnectCathedisAction() {
    const settings = await getSettings();
    settings.cathedis = {
        username: '',
        password: '',
        isConnected: false
    };
    await saveSettings(settings);
    revalidatePath('/admin/settings');
    return { success: true };
}

export async function savePickupLocationsAction(formData: FormData) {
    const pickupLocations = formData.get('pickupLocations') as string;
    try {
        const settings = await getSettings();
        settings.pickupLocations = pickupLocations;
        await saveSettings(settings);
        revalidatePath('/admin/settings');
        revalidatePath('/admin/fulfillment');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// WooCommerce Actions
export async function getWoocommerceSettingsAction() {
    const settings = await getSettings();
    return settings.woocommerce || { storeUrl: '', consumerKey: '', consumerSecret: '', isConnected: false };
}

export async function saveWoocommerceSettingsAction(formData: FormData) {
    const settings = await getSettings();
    const storeUrl = formData.get('storeUrl') as string;
    const consumerKey = formData.get('consumerKey') as string;
    const consumerSecret = formData.get('consumerSecret') as string;

    const verification = await verifyWoocommerceConnection(storeUrl, consumerKey, consumerSecret);

    if (verification.success) {
        settings.woocommerce = {
            storeUrl,
            consumerKey,
            consumerSecret,
            isConnected: true
        };
        await saveSettings(settings);
        revalidatePath('/admin/settings');
        return { success: true };
    } else {
        return { success: false, error: verification.error || 'Connection failed' };
    }
}

export async function disconnectWoocommerceAction() {
    const settings = await getSettings();
    if (settings.woocommerce) {
        settings.woocommerce = { storeUrl: '', consumerKey: '', consumerSecret: '', isConnected: false };
    }
    await saveSettings(settings);
    revalidatePath('/admin/settings');
}

export async function importWoocommerceOrdersAction(after?: string, before?: string) {
    const settings = await getSettings();
    if (!settings.woocommerce || !settings.woocommerce.isConnected) {
        return { success: false, error: 'WooCommerce not connected' };
    }

    try {
        const wcOrders = await fetchWoocommerceOrders(
            settings.woocommerce.storeUrl,
            settings.woocommerce.consumerKey,
            settings.woocommerce.consumerSecret,
            after,
            before
        );

        let validCities: any[] = [];
        try {
            validCities = await getCathedisCities();
        } catch (e) {
            console.warn('Failed to fetch cities for import resolution', e);
        }

        const orders = await getOrders();
        let importedCount = 0;

        for (const wcOrder of wcOrders) {
            // Heuristic duplicate check
            const isDuplicate = orders.some(o =>
                (o.date === wcOrder.date_created && parseFloat((wcOrder.total || "0")) === o.total) ||
                (o.logs && o.logs.some(l => l.message.includes(`Order #${wcOrder.id})`)))
            );

            if (isDuplicate) continue;

            const newOrder: Order = mapWoocommerceOrderToLocal(wcOrder, validCities);

            await createOrder(newOrder);
            importedCount++;
        }

        revalidatePath('/admin/orders');
        return { success: true, count: importedCount };

    } catch (e: any) {
        console.error('Import failed', e);
        return { success: false, error: e.message };
    }
}


export async function importWoocommerceProductsAction() {
    try {
        const settings = await getSettings();

        if (!settings.woocommerce?.isConnected || !settings.woocommerce.storeUrl) {
            return { success: false, error: 'WooCommerce is not connected.' };
        }

        const wcProducts = await fetchWoocommerceProducts(
            settings.woocommerce.storeUrl,
            settings.woocommerce.consumerKey,
            settings.woocommerce.consumerSecret
        );

        const existingProducts = await getProducts();
        let newCount = 0;
        let skippedCount = 0;

        for (const wcP of wcProducts) {
            const targetId = 'wc_' + wcP.id;

            // Check if product already exists by ID (previously imported) or SKU (manually created)
            const exists = existingProducts.find(p =>
                p.id === targetId ||
                (wcP.sku && p.sku === wcP.sku)
            );

            if (exists) {
                skippedCount++;
                continue;
            }

            const gallery = wcP.images.map(img => img.src);
            const mainImage = gallery.length > 0 ? gallery[0] : '';
            const newProduct: Product = {
                id: targetId,
                title: wcP.name,
                description: wcP.description || wcP.short_description || '',
                price: parseFloat(wcP.regular_price || wcP.price) || 0,
                salePrice: wcP.sale_price ? parseFloat(wcP.sale_price) : undefined,
                stock: wcP.stock_quantity ?? 0,
                sku: wcP.sku,
                image: mainImage,
                gallery: gallery,
                categoryIds: [],
                status: wcP.status === 'publish' ? 'live' : 'draft',
                isVisible: wcP.status === 'publish'
            };
            await saveProduct(newProduct);
            newCount++;
        }
        revalidatePath('/admin/products');
        return { success: true, count: newCount, skipped: skippedCount };
    } catch (err: any) {
        console.error('Import Error:', err);
        return { success: false, error: err.message };
    }
}
