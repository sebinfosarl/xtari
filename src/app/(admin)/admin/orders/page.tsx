import { getOrders, getProducts, getSalesPeople, getSettings } from "@/lib/db";
import OrdersView from "./OrdersView";

export default async function AdminOrdersPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();
    const settings = await getSettings();

    return (
        <OrdersView initialOrders={orders} products={products} salesPeople={salesPeople} isWooCommerceConnected={settings.woocommerce?.isConnected} />
    );
}
