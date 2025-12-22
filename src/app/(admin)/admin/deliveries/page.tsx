
import { getOrders, getProducts, getSalesPeople } from "@/lib/db";
import DeliveriesView from "./DeliveriesView";

export default async function AdminDeliveriesPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return (
        <DeliveriesView initialOrders={orders} products={products} salesPeople={salesPeople} />
    );
}
