
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTable(tableName: string) {
    console.log(`Clearing ${tableName}...`);
    // Delete all rows where ID is distinct from a dummy value (effectively all)
    // Adjust logic if table doesn't have 'id' or uses composite keys.
    // OrderItem, PurchaseOrderItem, KitComponent usually rely on IDs or parent IDs.
    // simpler: delete from table using a value that is always true if possible, or neq dummy.

    // For tables without 'id' (like maybe association tables if they don't have PK), we might need different logic.
    // Looking at db.ts:
    // OrderItem has 'id' (generated random string)
    // KitComponent - no explicit ID logged in db.ts types? let's assume 'id' or use other tactic.
    // Actually db.ts says KitComponent: { kitId, productId, quantity }. It might represent a many-to-many. 
    // Supabase usually requires a PK for proper management but `.delete()` works with filters.
    // To delete ALL, we can use `.neq('id', '00000')` if ID exists.
    // If no ID, we can use `.gt('quantity', -1)` or similar if applicable, or `.neq('kitId', '0')`.

    // Let's try standard NEQ ID first for entities, and specific field for components.

    let query = supabase.from(tableName).delete();

    if (['KitComponent'].includes(tableName)) {
        query = query.neq('quantity', -999999); // Hack to match all
    } else if (['PurchaseOrderItem', 'OrderItem', 'Order', 'Product', 'Kit', 'Brand', 'Category'].includes(tableName)) {
        query = query.neq('id', 'placeholder_impossible_id');
    } else {
        query = query.neq('id', 'placeholder_impossible_id');
    }

    const { error } = await query;
    if (error) {
        console.error(`❌ Failed to clear ${tableName}:`, error.message);
    } else {
        console.log(`✅ Cleared ${tableName}`);
    }
}

async function clearAll() {
    console.log('--- Wiping Database Steps ---');
    console.log('Target DB:', supabaseUrl);

    // 1. Clear Dependents (Items referencing Products)
    await clearTable('OrderItem');
    await clearTable('PurchaseOrderItem');
    await clearTable('KitComponent');

    // 2. Clear Dependents (Kits checking targetProductId)
    await clearTable('Kit');

    // 3. Clear Orders (dependent on nothing usually, but OrderItem depended on it)
    await clearTable('Order');

    // 4. Clear Purchase Orders (referenced by PurchaseOrderItem)
    await clearTable('PurchaseOrder');

    // 5. Finally Clear Products
    await clearTable('Product');

    console.log('--- Wipe Complete ---');
}

clearAll();
