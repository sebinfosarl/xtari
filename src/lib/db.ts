
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    image: string;
    featured?: boolean;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
}

export interface Order {
    id: string;
    items: {
        productId: string;
        quantity: number;
        price: number; // Stored at time of order/management
    }[];
    total: number;
    status: 'pending' | 'sales_order' | 'canceled' | 'no_reply';
    callResult?: 'Ligne Occupe' | 'Appel coupe' | 'Pas de reponse' | 'Rappel demande' | 'Boite vocal';
    cancellationMotif?: 'Mauvais numero' | 'Appel rejete' | 'commande en double' | 'Rupture de stock' | 'Pas de reponse' | 'Commande frauduleuse' | 'Annule sans reponse';
    cancellationComment?: string;
    date: string;
    customer: {
        name: string;
        email: string;
        address: string;
        phone: string;
    };
    salesPerson?: string;
    invoiceDownloaded?: boolean;
    callHistory?: { [day: number]: number }; // dayIndex: attemptCount
    logs?: {
        type: string;
        message: string;
        timestamp: string;
        user?: string; // Optional: track who did it
    }[];
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

// Categories
export async function getCategories(): Promise<Category[]> {
    return readJson<Category[]>('categories.json', [
        { id: '1', name: 'Ink for Printers', slug: 'ink-printers' },
        { id: '2', name: 'Printers', slug: 'printers' },
        { id: '3', name: 'Office Chairs & Tables', slug: 'office-furniture' },
        { id: '4', name: 'Office Storage', slug: 'office-storage' },
        { id: '5', name: 'Home Deco', slug: 'home-deco' },
        { id: '6', name: 'Toys', slug: 'toys' }
    ]);
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
