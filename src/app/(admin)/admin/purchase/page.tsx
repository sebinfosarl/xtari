import { getPurchaseOrders, getProducts, getSuppliers } from "@/lib/db";

export const dynamic = 'force-dynamic';
import PurchaseOrdersView from "./PurchaseOrdersView";

export default async function AdminPurchasePage() {
    const purchaseOrders = await getPurchaseOrders();
    const products = await getProducts();
    const suppliers = await getSuppliers();

    return (
        <PurchaseOrdersView
            initialPurchaseOrders={purchaseOrders}
            products={products}
            suppliers={suppliers}
        />
    );
}
