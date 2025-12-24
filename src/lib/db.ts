
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    stock?: number; // Added stock field
    salePrice?: number;
    categoryIds: string[]; // Changed from category: string
    category?: string; // Legacy support
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
    parentId?: string; // For subcategories
    order?: number; // For sorting
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
        price: number; // Stored at time of order/management
    }[];
    total: number;
    status: 'pending' | 'sales_order' | 'canceled' | 'no_reply' | 'archived';
    fulfillmentStatus?: 'to_pick' | 'picked' | 'returned';
    callResult?: 'Ligne Occupe' | 'Appel coupe' | 'Pas de reponse' | 'Rappel demande' | 'Boite vocal';
    cancellationMotif?: 'Mauvais numero' | 'Appel rejete' | 'commande en double' | 'Rupture de stock' | 'Pas de reponse' | 'Commande frauduleuse' | 'Annule sans reponse';
    cancellationComment?: string;
    date: string;
    customer: {
        name: string;
        email: string;
        address: string;
        phone: string;
        city?: string;
        sector?: string;
    };
    salesPerson?: string;
    invoiceDownloaded?: boolean;
    invoiceDate?: string;
    companyName?: string;
    ice?: string;
    callHistory?: { [day: number]: number }; // dayIndex: attemptCount
    logs?: {
        type: string;
        message: string;
        timestamp: string;
        user?: string; // Optional: track who did it
    }[];
    shippingId?: string;
    shippingStatus?: string;
    shippingLabelUrl?: string; // Physical label (A6/Stickers)
    shippingVoucherUrl?: string; // Bon de Livraison (A5/Voucher)
    paymentType?: string;
    deliveryType?: string;
    rangeWeight?: string;
    weight?: number;
    packageCount?: number;
    allowOpening?: number;
    width?: number;
    length?: number;
    height?: number;
    fragile?: boolean;
    insuranceValue?: number;
    deliveryNotePrinted?: boolean;
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

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }
}

function readJson<T>(filename: string, defaultValue: T): T {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
        return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson<T>(filename: string, data: T) {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Products
export async function getProducts(): Promise<Product[]> {
    return readJson<Product[]>('products.json', []);
}

export async function saveProduct(product: Product) {
    const products = await getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
        products[index] = product;
    } else {
        products.push(product);
    }
    writeJson('products.json', products);
}

export async function updateProductStatus(id: string, status: 'live' | 'draft' | 'archived') {
    const products = await getProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        product.status = status;
        // Sync visibility: Only 'live' products are visible
        product.isVisible = status === 'live';
        writeJson('products.json', products);
    }
}

export async function deleteProduct(id: string) {
    const products = await getProducts();
    const filtered = products.filter(p => p.id !== id);
    writeJson('products.json', filtered);
}

// Categories
export async function getCategories(): Promise<Category[]> {
    const categories = await readJson<Category[]>('categories.json', []);
    return categories.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function saveCategory(category: Category) {
    const categories = await getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
        categories[index] = category;
    } else {
        categories.push(category);
    }
    writeJson('categories.json', categories);
}

export async function deleteCategory(id: string) {
    const categories = await getCategories();

    // Find all descendant IDs recursively
    const getDescendants = (parentId: string): string[] => {
        const children = categories.filter(c => c.parentId === parentId);
        let descendants: string[] = children.map(c => c.id);
        for (const child of children) {
            descendants = [...descendants, ...getDescendants(child.id)];
        }
        return descendants;
    };

    const idsToDelete = [id, ...getDescendants(id)];
    const filtered = categories.filter(c => !idsToDelete.includes(c.id));
    writeJson('categories.json', filtered);
}

// Brands
export async function getBrands(): Promise<Brand[]> {
    return readJson<Brand[]>('brands.json', []);
}

export async function saveBrand(brand: Brand) {
    const brands = await getBrands();
    const index = brands.findIndex(b => b.id === brand.id);
    if (index >= 0) {
        brands[index] = brand;
    } else {
        brands.push(brand);
    }
    writeJson('brands.json', brands);
}

export async function deleteBrand(id: string) {
    const brands = await getBrands();
    const filtered = brands.filter(b => b.id !== id);
    writeJson('brands.json', filtered);
}

// Attributes
export async function getAttributes(): Promise<Attribute[]> {
    return readJson<Attribute[]>('attributes.json', []);
}

export async function saveAttribute(attribute: Attribute) {
    const attributes = await getAttributes();
    const index = attributes.findIndex(a => a.id === attribute.id);
    if (index >= 0) {
        attributes[index] = attribute;
    } else {
        attributes.push(attribute);
    }
    writeJson('attributes.json', attributes);
}

export async function deleteAttribute(id: string) {
    const attributes = await getAttributes();
    const filtered = attributes.filter(a => a.id !== id);
    writeJson('attributes.json', filtered);
}

// Orders
export async function getOrders(): Promise<Order[]> {
    return readJson<Order[]>('orders.json', []);
}

export async function createOrder(order: Order) {
    const orders = await getOrders();
    orders.push(order);
    writeJson('orders.json', orders);
}

export async function getOrderById(id: string): Promise<Order | undefined> {
    const orders = await getOrders();
    return orders.find(o => o.id === id);
}

export async function updateOrder(order: Order) {
    const orders = await getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
        orders[index] = order;
    }
    writeJson('orders.json', orders);
}

// Users
export interface User {
    username: string;
    password: string; // Plaintext for MVP only
}

export async function getUsers(): Promise<User[]> {
    // Seed default admin if empty
    return readJson<User[]>('users.json', [
        { username: 'admin', password: 'admin' }
    ]);
}

export async function getUser(username: string): Promise<User | undefined> {
    const users = await getUsers();
    return users.find(u => u.username === username);
}

export async function createUser(user: User) {
    const users = await getUsers();
    if (users.find(u => u.username === user.username)) {
        throw new Error('User already exists');
    }
    users.push(user);
    writeJson('users.json', users);
}

// Sales People
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
    signature?: string; // Image as base64 or URL
    cachet?: string; // Image as base64 or URL
}

export async function getSalesPeople(): Promise<SalesPerson[]> {
    return readJson<SalesPerson[]>('salespeople.json', []);
}

export async function saveSalesPerson(salesPerson: SalesPerson) {
    const people = await getSalesPeople();
    const index = people.findIndex(p => p.id === salesPerson.id);
    if (index >= 0) {
        people[index] = salesPerson;
    } else {
        people.push(salesPerson);
    }
    writeJson('salespeople.json', people);
}

export async function deleteSalesPerson(id: string) {
    const people = await getSalesPeople();
    const filtered = people.filter(p => p.id !== id);
    writeJson('salespeople.json', filtered);
}

// Suppliers
export async function getSuppliers(): Promise<Supplier[]> {
    return readJson<Supplier[]>('suppliers.json', []);
}

export async function saveSupplier(supplier: Supplier) {
    const suppliers = await getSuppliers();
    const index = suppliers.findIndex(s => s.id === supplier.id);
    if (index >= 0) {
        suppliers[index] = supplier;
    } else {
        suppliers.push(supplier);
    }
    writeJson('suppliers.json', suppliers);
}

export async function deleteSupplier(id: string) {
    const suppliers = await getSuppliers();
    const filtered = suppliers.filter(s => s.id !== id);
    writeJson('suppliers.json', filtered);
}

// Purchase Orders
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return readJson<PurchaseOrder[]>('purchase_orders.json', []);
}

export async function savePurchaseOrder(po: PurchaseOrder) {
    const pos = await getPurchaseOrders();
    const index = pos.findIndex(p => p.id === po.id);
    if (index >= 0) {
        pos[index] = po;
    } else {
        pos.push(po);
    }
    writeJson('purchase_orders.json', pos);
}

export async function deletePurchaseOrder(id: string) {
    const pos = await getPurchaseOrders();
    const filtered = pos.filter(p => p.id !== id);
    writeJson('purchase_orders.json', filtered);
}

// Kits
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

export async function getKits(): Promise<Kit[]> {
    return readJson<Kit[]>('kits.json', []);
}

export async function saveKit(kit: Kit) {
    const kits = await getKits();
    const index = kits.findIndex(k => k.id === kit.id);
    if (index >= 0) {
        kits[index] = kit;
    } else {
        kits.push(kit);
    }
    writeJson('kits.json', kits);
}

export async function deleteKit(id: string) {
    const kits = await getKits();
    const filtered = kits.filter(k => k.id !== id);
    writeJson('kits.json', filtered);
}

// Settings
export interface Settings {
    cathedis: {
        username: string;
        password: string;
        isConnected: boolean;
    };
    pickupLocations?: string; // Multiline string: "Label - ID"
}

export async function getSettings(): Promise<Settings> {
    return readJson<Settings>('settings.json', {
        cathedis: {
            username: '',
            password: '',
            isConnected: false
        },
        pickupLocations: ''
    });
}

export async function saveSettings(settings: Settings) {
    writeJson('settings.json', settings);
}
