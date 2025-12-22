import { getOrders, getProducts, getSalesPeople } from "@/lib/db";
import FulfillmentView from "./FulfillmentView";

export default async function AdminFulfillmentPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return (
        <FulfillmentView initialOrders={orders} products={products} salesPeople={salesPeople} />
    );
}
