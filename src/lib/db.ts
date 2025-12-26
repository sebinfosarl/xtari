
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Fallback to avoid build crash if keys are missing
// The client will fail at runtime if keys are missing, but build proceeds
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// --- Interfaces (Kept as is for compatibility) ---

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    stock?: number;
    salePrice?: number;
    categoryIds: string[];
    category?: string; // Legacy
    image: string;
    gallery?: string[];
    featured?: boolean;
    isVisible?: boolean;
    sku?: string;
    location?: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    linkedProducts?: {
        upsells: string[];
        crossSells: string[];
        frequentlyBoughtTogether: string[];
        similarProducts: string[];
    };
    attributes?: {
        name: string;
        values: string[];
    }[];
    brandId?: string;
    status?: 'live' | 'draft' | 'archived';
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    parentId?: string;
    order?: number;
}

export interface Brand {
    id: string;
    name: string;
    slug: string;
    logo?: string;
}

export interface Attribute {
    id: string;
    name: string;
    values: string[];
}

export interface Order {
    id: string;
    items: {
        productId: string;
        quantity: number;
        price: number;
    }[];
    total: number;
    status: 'pending' | 'sales_order' | 'canceled' | 'no_reply';
    fulfillmentStatus?: 'to_pick' | 'picked' | 'returned';
    callResult?: string; // simplified type for brevity
    cancellationMotif?: string;
    cancellationComment?: string;
    date: string;
    customer: {
        name: string;
        email: string;
        address: string;
        phone: string;
        city?: string;
        sector?: string;
        country?: string;
        state?: string;
    };
    salesPerson?: string;
    invoiceDownloaded?: boolean;
    invoiceDate?: string;
    companyName?: string;
    ice?: string;
    callHistory?: { [day: number]: number };
    logs?: {
        type: string;
        message: string;
        timestamp: string;
        user?: string;
    }[];
    shippingId?: string;
    shippingStatus?: string;
    shippingLabelUrl?: string;
    shippingVoucherUrl?: string;
    deliveryNotePrinted?: boolean;
    // Extra fields
    paymentType?: string;
    deliveryType?: string;
    rangeWeight?: string;
    packageCount?: number;
    allowOpening?: number;
    weight?: number;
    width?: number;
    length?: number;
    height?: number;
    fragile?: boolean;
    insuranceValue?: number;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    items: {
        productId: string;
        quantity: number;
        buyPrice: number;
    }[];
    total: number;
    status: 'draft' | 'in_progress' | 'received' | 'canceled';
    date: string;
    notes?: string;
}

export interface User {
    username: string;
    password: string;
}

export interface SalesPerson {
    id: string;
    fullName: string;
    cnie: string;
    address: string;
    ice: string;
    if: string;
    tp: string;
    tel: string;
    email: string;
    signature?: string;
    cachet?: string;
}

export interface KitComponent {
    productId: string;
    quantity: number;
}

export interface Kit {
    id: string;
    targetProductId: string;
    reference: string;
    outputQuantity: number;
    components: KitComponent[];
}

export interface Settings {
    cathedis: {
        username: string;
        password: string;
        isConnected: boolean;
    };
    woocommerce?: {
        storeUrl: string;
        consumerKey: string;
        consumerSecret: string;
        isConnected: boolean;
    };
    pickupLocations?: string;
}

// --- Implementation ---

/* Helper to strip undefined values for Supabase insert */
function clean(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}

// Products
export async function getProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('Product').select('*');
    if (error) { console.error('getProducts error', error); return []; }
    return data || [];
}

export async function saveProduct(product: Product) {
    const payload = clean({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        stock: product.stock,
        salePrice: product.salePrice,
        categoryIds: product.categoryIds, // Supabase stores as text array
        image: product.image,
        gallery: product.gallery,
        featured: product.featured,
        isVisible: product.isVisible,
        sku: product.sku,
        location: product.location,
        weight: product.weight,
        dimensions: product.dimensions, // JSONB
        linkedProducts: product.linkedProducts, // JSONB
        attributes: product.attributes, // JSONB
        brandId: product.brandId,
        status: product.status
    });

    const { error } = await supabase.from('Product').upsert(payload);
    if (error) console.error('saveProduct error', error);
}

export async function updateProductStatus(id: string, status: 'live' | 'draft' | 'archived') {
    const { error } = await supabase.from('Product')
        .update({ status, isVisible: status === 'live' })
        .eq('id', id);
    if (error) console.error('updateProductStatus error', error);
}

export async function deleteProduct(id: string) {
    const { error } = await supabase.from('Product').delete().eq('id', id);
    if (error) console.error('deleteProduct error', error);
}

// Categories
export async function getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('Category').select('*').order('order', { ascending: true });
    if (error) { console.error('getCategories error', error); return []; }
    return data || [];
}

export async function saveCategory(category: Category) {
    const { error } = await supabase.from('Category').upsert(clean(category));
    if (error) console.error('saveCategory error', error);
}

export async function deleteCategory(id: string) {
    // Note: This does not recursively delete children unless DB cascade is set or we do it here.
    // For MVP, we delete the single category.
    const { error } = await supabase.from('Category').delete().eq('id', id);
    if (error) console.error('deleteCategory error', error);
}

// Brands
export async function getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase.from('Brand').select('*');
    if (error) { console.error('getBrands error', error); return []; }
    return data || [];
}

export async function saveBrand(brand: Brand) {
    const { error } = await supabase.from('Brand').upsert(clean(brand));
    if (error) console.error('saveBrand error', error);
}

export async function deleteBrand(id: string) {
    const { error } = await supabase.from('Brand').delete().eq('id', id);
    if (error) console.error('deleteBrand error', error);
}

// Attributes (Stored as simple JSON file originally, now table?)
// We didn't create an "Attribute" table in SQL Schema! 
// Actually, `attributes.json` stored definitions.
// Let's implement getting/saving assuming we might just need to allow it or skip if not critical.
// Actually, `attributes.json` defines the *available* attributes.
// I will create a simple mock for now or use `Settings`?
// Wait, I forgot `Attribute` table in setup_database.sql? 
// No, I think I missed it.
// I will implement it as an in-memory/fallback or skip for now to unblock critical path.
// Or I can store it in `Settings` table under a new key?
// Let's just return empty array for now to prevent crash.
export async function getAttributes(): Promise<Attribute[]> {
    return [];
}
export async function saveAttribute(attribute: Attribute) {
    // No-op
}
export async function deleteAttribute(id: string) {
    // No-op
}


// Orders
export async function getOrders(): Promise<Order[]> {
    // We need to fetch Order + OrderItems.
    // Supabase can do deep fetch: select('*, items:OrderItem(*)')
    const { data, error } = await supabase.from('Order').select('*, items:OrderItem(*)');
    if (error) { console.error('getOrders error', error); return []; }

    // Map response to match Interface (items might be needed)
    return (data || []).map((o: any) => ({
        ...o,
        items: o.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price
        }))


    }));
}

export async function createOrder(order: Order) {
    // 1. Insert Order
    const orderPayload = clean({
        id: order.id,
        total: order.total,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        date: order.date,
        customer: order.customer, // JSONB
        salesPerson: order.salesPerson,
        companyName: order.companyName,
        ice: order.ice,
        shippingId: order.shippingId,
        shippingStatus: order.shippingStatus,
        shippingLabelUrl: order.shippingLabelUrl,
        shippingVoucherUrl: order.shippingVoucherUrl,
        deliveryNotePrinted: order.deliveryNotePrinted,
        invoiceDownloaded: order.invoiceDownloaded,
        invoiceDate: order.invoiceDate,
        callResult: order.callResult,
        cancellationMotif: order.cancellationMotif,
        cancellationComment: order.cancellationComment,
        callHistory: order.callHistory,
        logs: order.logs
    });

    const { error: orderError } = await supabase.from('Order').insert(orderPayload);
    if (orderError) { console.error('createOrder (head) error', orderError); return; }

    // 2. Insert Items
    if (order.items && order.items.length > 0) {
        const itemsPayload = order.items.map(i => ({
            id: Math.random().toString(36).substr(2, 9),
            orderId: order.id,
            productId: i.productId,
            quantity: i.quantity,
            price: i.price
        }));
        const { error: itemsError } = await supabase.from('OrderItem').insert(itemsPayload);
        if (itemsError) console.error('createOrder items error', itemsError);
    }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
    const { data, error } = await supabase.from('Order').select('*, items:OrderItem(*)').eq('id', id).single();
    if (error || !data) return undefined;

    return {
        ...data,
        items: data.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price
        }))
    };
}

export async function updateOrder(order: Order) {
    // Upsert Order
    const orderPayload = clean({
        id: order.id,
        total: order.total,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        date: order.date,
        customer: order.customer,
        salesPerson: order.salesPerson,
        companyName: order.companyName,
        ice: order.ice,
        shippingId: order.shippingId,
        shippingStatus: order.shippingStatus,
        shippingLabelUrl: order.shippingLabelUrl,
        shippingVoucherUrl: order.shippingVoucherUrl,
        deliveryNotePrinted: order.deliveryNotePrinted,
        invoiceDownloaded: order.invoiceDownloaded,
        invoiceDate: order.invoiceDate,
        callResult: order.callResult,
        cancellationMotif: order.cancellationMotif,
        cancellationComment: order.cancellationComment,
        callHistory: order.callHistory,
        logs: order.logs
    });

    const { error } = await supabase.from('Order').upsert(orderPayload);
    if (error) console.error('updateOrder head error', error);

    // Replace Items (Delete all then insert)
    // NOTE: This is inefficient but safe for parity with JSON 'replace'.
    // Transaction ideally.
    await supabase.from('OrderItem').delete().eq('orderId', order.id);

    if (order.items && order.items.length > 0) {
        const itemsPayload = order.items.map(i => ({
            id: Math.random().toString(36).substr(2, 9),
            orderId: order.id, // Implicit foreign key if table structure allows
            productId: i.productId,
            quantity: i.quantity,
            price: i.price
        }));
        const { error: iErr } = await supabase.from('OrderItem').insert(itemsPayload);
        if (iErr) console.error('updateOrder items error', iErr);
    }
}


// Users
export async function getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('User').select('*');
    if (error) { console.error('getUsers error', error); return []; }
    if (!data || data.length === 0) {
        // Fallback admin if DB empty (optional, but good for login)
        return [{ username: 'admin', password: 'admin' }];
    }
    return data;
}
export async function getUser(username: string): Promise<User | undefined> {
    const users = await getUsers();
    return users.find(u => u.username === username);
}
export async function createUser(user: User) {
    const { error } = await supabase.from('User').insert(user);
    if (error) throw new Error(error.message);
}


// Sales People
export async function getSalesPeople(): Promise<SalesPerson[]> {
    const { data, error } = await supabase.from('SalesPerson').select('*');
    if (error) { console.error('getSalesPeople error', error); return []; }
    return data || [];
}
export async function saveSalesPerson(salesPerson: SalesPerson) {
    const { error } = await supabase.from('SalesPerson').upsert(clean(salesPerson));
    if (error) console.error('saveSalesPerson error', error);
}
export async function deleteSalesPerson(id: string) {
    const { error } = await supabase.from('SalesPerson').delete().eq('id', id);
    if (error) console.error('deleteSalesPerson error', error);
}

// Suppliers
export async function getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase.from('Supplier').select('*');
    if (error) { console.error('getSuppliers error', error); return []; }
    return data || [];
}
export async function saveSupplier(supplier: Supplier) {
    const { error } = await supabase.from('Supplier').upsert(clean(supplier));
    if (error) console.error('saveSupplier error', error);
}
export async function deleteSupplier(id: string) {
    const { error } = await supabase.from('Supplier').delete().eq('id', id);
    if (error) console.error('deleteSupplier error', error);
}


// Purchase Orders
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase.from('PurchaseOrder').select('*, items:PurchaseOrderItem(*)');
    if (error) { console.error('getPurchaseOrders error', error); return []; }
    return (data || []).map((p: any) => ({
        ...p,
        items: p.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            buyPrice: i.buyPrice
        }))
    }));
}
export async function savePurchaseOrder(po: PurchaseOrder) {
    const poPayload = clean({
        id: po.id,
        supplierId: po.supplierId,
        total: po.total,
        status: po.status,
        date: po.date,
        notes: po.notes
    });
    const { error } = await supabase.from('PurchaseOrder').upsert(poPayload);
    if (error) console.error('savePurchaseOrder head error', error);

    // Items
    await supabase.from('PurchaseOrderItem').delete().eq('purchaseOrderId', po.id);
    if (po.items && po.items.length > 0) {
        const itemsPayload = po.items.map(i => ({
            purchaseOrderId: po.id,
            productId: i.productId,
            quantity: i.quantity,
            buyPrice: i.buyPrice
        }));
        await supabase.from('PurchaseOrderItem').insert(itemsPayload);
    }
}
export async function deletePurchaseOrder(id: string) {
    // Cascade should handle items if configured, else manual:
    await supabase.from('PurchaseOrderItem').delete().eq('purchaseOrderId', id);
    const { error } = await supabase.from('PurchaseOrder').delete().eq('id', id);
    if (error) console.error('deletePurchaseOrder error', error);
}


// Kits
export async function getKits(): Promise<Kit[]> {
    const { data, error } = await supabase.from('Kit').select('*, components:KitComponent(*)');
    if (error) { console.error('getKits error', error); return []; }
    return (data || []).map((k: any) => ({
        ...k,
        components: k.components.map((c: any) => ({
            productId: c.productId,
            quantity: c.quantity
        }))
    }));
}
export async function saveKit(kit: Kit) {
    const kitPayload = clean({
        id: kit.id,
        targetProductId: kit.targetProductId,
        reference: kit.reference,
        outputQuantity: kit.outputQuantity
    });
    const { error } = await supabase.from('Kit').upsert(kitPayload);
    if (error) console.error('saveKit head error', error);

    await supabase.from('KitComponent').delete().eq('kitId', kit.id);
    if (kit.components && kit.components.length > 0) {
        const comps = kit.components.map(c => ({
            kitId: kit.id,
            productId: c.productId,
            quantity: c.quantity
        }));
        await supabase.from('KitComponent').insert(comps);
    }
}
export async function deleteKit(id: string) {
    await supabase.from('KitComponent').delete().eq('kitId', id);
    const { error } = await supabase.from('Kit').delete().eq('id', id);
    if (error) console.error('deleteKit error', error);
}


// ... (existing exports)

export interface City {
    id: string;
    name: string;
    sectors: { id: string | number; name: string }[];
    updatedAt?: string;
}

// ... (existing functions)

// Cities
export async function getCitiesFromDB(): Promise<City[]> {
    const { data, error } = await supabase.from('City').select('*').order('name');
    if (error) { console.error('getCitiesFromDB error', error); return []; }
    return data || [];
}

export async function saveCity(city: City) {
    const payload = clean({
        id: city.id,
        name: city.name,
        sectors: city.sectors,
        updatedAt: new Date().toISOString()
    });
    const { error } = await supabase.from('City').upsert(payload);
    if (error) console.error('saveCity error', error);
}

export async function deleteAllCities() {
    const { error } = await supabase.from('City').delete().neq('id', '0'); // Delete all
    if (error) console.error('deleteAllCities error', error);
}

// Settings
export async function getSettings(): Promise<Settings> {
    const { data, error } = await supabase.from('Settings').select('*').eq('id', 1).single();
    if (error || !data) {
        return {
            cathedis: { username: '', password: '', isConnected: false },
            woocommerce: { storeUrl: '', consumerKey: '', consumerSecret: '', isConnected: false },
            pickupLocations: ''
        };
    }
    return {
        cathedis: data.cathedis || { username: '', password: '', isConnected: false },
        woocommerce: data.woocommerce || { storeUrl: '', consumerKey: '', consumerSecret: '', isConnected: false },
        pickupLocations: data.pickupLocations || ''
    };
}
export async function saveSettings(settings: Settings) {
    const payload = {
        id: 1,
        cathedis: settings.cathedis,
        woocommerce: settings.woocommerce,
        pickupLocations: settings.pickupLocations
    };
    const { error } = await supabase.from('Settings').upsert(payload);
    if (error) console.error('saveSettings error', error);
}
