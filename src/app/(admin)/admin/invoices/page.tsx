
import { getOrders, getProducts, getSalesPeople } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import InvoicesView from './InvoicesView';

export default async function InvoicesPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return (
        <Suspense fallback={<div>Loading Invoices...</div>}>
            <InvoicesView initialOrders={orders} products={products} salesPeople={salesPeople} />
        </Suspense>
    );
}
