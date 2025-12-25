import { Suspense } from 'react';
import { getOrders, getProducts, getSalesPeople } from '@/lib/db';
import InvoicesView from './InvoicesView';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    const orders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    return (
        <Suspense fallback={<div className="p-8 text-center">Loading invoices...</div>}>
            <InvoicesView initialOrders={orders} products={products} salesPeople={salesPeople} />
        </Suspense>
    );
}
