import { getOrders, getProducts, getSalesPeople, getPurchaseOrders, getSuppliers, getSettings, getKits } from "@/lib/db";
import FulfillmentView from "./FulfillmentView";

export default async function AdminFulfillmentPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();
    const purchaseOrders = await getPurchaseOrders();
    const suppliers = await getSuppliers();
    const settings = await getSettings();
    const kits = await getKits();

    return (
        <FulfillmentView
            initialOrders={orders}
            products={products}
            salesPeople={salesPeople}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            pickupLocationsRaw={settings.pickupLocations || ''}
            kits={kits}
        />
    );
}
