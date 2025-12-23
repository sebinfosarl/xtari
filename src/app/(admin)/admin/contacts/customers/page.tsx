
import { getOrders, getProducts, getSalesPeople } from '@/lib/db';
import ContactsView from '../ContactsView';

export default async function CustomersPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return (
        <ContactsView
            orders={orders}
            products={products}
            salesPeople={salesPeople}
            mode="customers"
        />
    );
}
