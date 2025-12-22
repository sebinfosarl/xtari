import { getOrders, getProducts, getSalesPeople } from "@/lib/db";
import OrdersView from "./OrdersView";

export default async function AdminOrdersPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return (
        <OrdersView initialOrders={orders} products={products} salesPeople={salesPeople} />
    );
}
