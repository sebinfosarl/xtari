
import { getOrders, getProducts, getSalesPeople } from '@/lib/db';
import InvoicesView from './InvoicesView';

export default async function InvoicesPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return <InvoicesView initialOrders={orders} products={products} salesPeople={salesPeople} />;
}
