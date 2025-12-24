import { getOrders, getProducts } from '@/lib/db';
import PickingLabel from '@/components/PickingLabel';
import { notFound } from 'next/navigation';

export default async function PrintPickingListPage({
    searchParams,
}: {
    searchParams: Promise<{ ids: string }>;
}) {
    const { ids } = await searchParams;

    if (!ids) {
        return <div>No orders selected</div>;
    }

    const orderIds = ids.split(',').filter(Boolean);

    // Fetch all needed data
    // In a real app with many orders, we should probably fetch only by ID
    // But getOrders() is cached/fast enough for this MVP scope
    const allOrders = await getOrders();
    const products = await getProducts();

    const selectedOrders = allOrders.filter(o => orderIds.includes(o.id));

    if (selectedOrders.length === 0) {
        notFound();
    }

    return (
        <div style={{ background: 'white', minHeight: '100vh' }}>
            <PickingLabel orders={selectedOrders} products={products} />
            <script dangerouslySetInnerHTML={{
                __html: `
                    window.onload = function() { 
                        // Small delay to ensure images/barcodes are rendered
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    }
                `
            }} />
        </div>
    );
}
