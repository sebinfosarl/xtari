
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Eye, Truck, Calendar, Phone, Search, MapPin, Package } from 'lucide-react';
import { createShipmentAction } from '@/app/actions';
import styles from '../Admin.module.css';
import DeliveryDialog from '@/components/DeliveryDialog';

interface DeliveriesViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
}

export default function DeliveriesView({ initialOrders: orders, products, salesPeople }: DeliveriesViewProps) {
    const router = useRouter();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [isShippingBulk, setIsShippingBulk] = useState(false);

    // Sync selectedOrder with updated orders prop (for router.refresh())
    useEffect(() => {
        if (selectedOrder) {
            const fresh = orders.find(o => o.id === selectedOrder.id);
            if (fresh && fresh !== selectedOrder) {
                setSelectedOrder(fresh);
            }
        }
    }, [orders, selectedOrder]);

    // Filter for Sales Orders only
    const deliveries = orders.filter(o => o.status === 'sales_order');

    const filteredDeliveries = deliveries.filter(o => {
        // Search query filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesId = o.id.toLowerCase().includes(q);
            const matchesName = o.customer.name.toLowerCase().includes(q);
            const matchesPhone = o.customer.phone.toLowerCase().includes(q);
            const matchesCity = o.customer.city?.toLowerCase().includes(q);
            if (!matchesId && !matchesName && !matchesPhone && !matchesCity) return false;
        }

        return true;
    });

    const handleBulkShip = async () => {
        const selectedOrders = deliveries.filter(o => selectedOrderIds.includes(o.id) && !o.shippingId);
        if (selectedOrders.length === 0) {
            alert('No pending orders found in selection.');
            return;
        }

        if (!confirm(`Export ${selectedOrders.length} selected orders to Cathedis?`)) return;

        const { createShipmentAction } = await import('@/app/actions');

        setIsShippingBulk(true);
        let successCount = 0;
        let errors = [];

        for (const order of selectedOrders) {
            try {
                const res = await createShipmentAction(order);
                if (res.success) {
                    successCount++;
                } else {
                    errors.push(`${order.id}: ${res.error}`);
                }
            } catch (err: any) {
                errors.push(`${order.id}: ${err.message}`);
            }
        }

        setIsShippingBulk(false);
        alert(`Successfully shipped ${successCount}/${selectedOrders.length} orders.`);
        if (errors.length > 0) {
            console.error('Bulk shipping errors:', errors);
            alert(`Some orders failed to ship. Check console for details.`);
        }
        setSelectedOrderIds([]);
    };


    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className={styles.sectionTitle}>Delivery Management</h2>
                        <div className={styles.statTrend}>{filteredDeliveries.length} active deliveries</div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                        <button
                            onClick={handleBulkShip}
                            disabled={isShippingBulk || selectedOrderIds.length === 0}
                            className="btn btn-sm btn-primary"
                            title="Export selected orders to Cathedis"
                        >
                            <Truck size={16} className={isShippingBulk ? 'animate-spin' : ''} />
                            {isShippingBulk ? 'Shipping...' : `Ship (${selectedOrderIds.length})`}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1" style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search by ID, Name, Phone or City..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem',
                                background: 'white'
                            }}
                        />
                        <div style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                            <Search size={16} />
                        </div>
                    </div>
                    {/* Filter buttons removed as requested */}
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectedOrderIds.length === filteredDeliveries.length && filteredDeliveries.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedOrderIds(filteredDeliveries.map(d => d.id));
                                        } else {
                                            setSelectedOrderIds([]);
                                        }
                                    }}
                                />
                            </th>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Destination</th>
                            <th>Shipping Status</th>
                            <th>Manage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDeliveries.map(order => (
                            <tr key={order.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedOrderIds.includes(order.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedOrderIds([...selectedOrderIds, order.id]);
                                            } else {
                                                setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                            }
                                        }}
                                    />
                                </td>
                                <td className={styles.bold}>#{order.id}</td>
                                <td>
                                    <div className={styles.resultBadge}><Calendar size={12} /> {new Date(order.date).toLocaleDateString()}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}><Phone size={10} style={{ display: 'inline', marginRight: '2px' }} /> {order.customer.phone || 'No phone'}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}><MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> {order.customer.city || 'No City'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customer.sector || 'No sector'}</div>
                                </td>
                                <td>
                                    {order.shippingId ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                ID: {order.shippingId}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-600">
                                                {order.shippingStatus || 'SHIPPED'}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded">
                                            Awaiting Export
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className={styles.eyeBtn}
                                        title="Manage Delivery"
                                        style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                                    >
                                        <Truck size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredDeliveries.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                    <p>No active deliveries found in this view.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {
                selectedOrder && (
                    <DeliveryDialog
                        order={selectedOrder}
                        products={products}
                        onClose={() => setSelectedOrder(null)}
                    />
                )
            }
        </div >
    );
}
