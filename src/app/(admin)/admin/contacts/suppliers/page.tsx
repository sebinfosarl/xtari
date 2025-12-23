
import { getSuppliers, getPurchaseOrders, getProducts } from '@/lib/db';
import ContactsView from '../ContactsView';

export default async function SuppliersPage() {
    const suppliers = await getSuppliers();
    const purchaseOrders = await getPurchaseOrders();
    const products = await getProducts(); // Needed for PO dialog detail

    return (
        <ContactsView
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            products={products}
            orders={[]} // Not needed in supplier mode
            salesPeople={[]} // Not needed in supplier mode
            mode="suppliers"
        />
    );
}
