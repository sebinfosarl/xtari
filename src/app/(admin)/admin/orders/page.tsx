import { getOrders, getProducts, getSalesPeople, getSettings, getKits } from "@/lib/db";
import OrdersView from "./OrdersView";

export default async function AdminOrdersPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();
    const settings = await getSettings();
    const kits = await getKits();

    return (
        <OrdersView
            initialOrders={orders}
            products={products}
            salesPeople={salesPeople}
            isWooCommerceConnected={settings.woocommerce?.isConnected}
            kits={kits}
        />
    );
}
