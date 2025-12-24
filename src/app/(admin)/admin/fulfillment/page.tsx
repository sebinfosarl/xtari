import { getOrders, getProducts, getSalesPeople, getPurchaseOrders, getSuppliers, getSettings } from "@/lib/db";
import FulfillmentView from "./FulfillmentView";

export default async function AdminFulfillmentPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();
    const purchaseOrders = await getPurchaseOrders();
    const suppliers = await getSuppliers();
    const settings = await getSettings();

    return (
        <FulfillmentView
            initialOrders={orders}
            products={products}
            salesPeople={salesPeople}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            pickupLocationsRaw={settings.pickupLocations || ''}
        />
    );
}
