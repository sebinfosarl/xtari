import { getOrders, getProducts, getSalesPeople } from '@/lib/db';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { notFound } from 'next/navigation';

export default async function PrintInvoicePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const allOrders = await getOrders();
    const products = await getProducts();
    const salesPeople = await getSalesPeople();

    const order = allOrders.find(o => o.id === id);

    if (!order) {
        notFound();
    }

    return (
        <div style={{ background: 'white', minHeight: '100vh' }}>
            <InvoiceTemplate order={order} products={products} salesPeople={salesPeople} />
            <script dangerouslySetInnerHTML={{
                __html: `
                    window.onload = function() {
                        // Small delay to ensure rendering matches
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    }
                `
            }} />
        </div>
    );
}
