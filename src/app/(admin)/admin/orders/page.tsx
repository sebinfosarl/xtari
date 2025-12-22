
import { getOrders, getProducts } from "@/lib/db";
import OrdersView from "./OrdersView";

export default async function AdminOrdersPage() {
    const orders = await getOrders();
    const products = await getProducts();

    return (
        <OrdersView initialOrders={orders} products={products} />
    );
}
