'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Eye, Truck, Calendar, Phone, Search, MapPin, Package, CheckCircle, Circle, X, ClipboardList, Printer, CheckCircle2 } from 'lucide-react';
import { createShipmentAction, updateOrderAction, bulkMarkDeliveryNotePrintedAction } from '@/app/actions';
import styles from '../Admin.module.css';
import DeliveryDialog from '@/components/DeliveryDialog';
import PickingLabel from '@/components/PickingLabel';

interface FulfillmentViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
}

export default function FulfillmentView({ initialOrders: orders, products, salesPeople }: FulfillmentViewProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'pick' | 'deliveries'>('pick');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [isShippingBulk, setIsShippingBulk] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

    // Sync selectedOrder with updated orders prop
    useEffect(() => {
        if (selectedOrder) {
            const fresh = orders.find(o => o.id === selectedOrder.id);
            if (fresh && fresh !== selectedOrder) {
                setSelectedOrder(fresh);
            }
        }
    }, [orders, selectedOrder]);

    // Filters
    const pickOrders = orders.filter(o => o.status === 'sales_order' && (!o.fulfillmentStatus || o.fulfillmentStatus === 'to_pick'));
    const deliveryOrders = orders.filter(o => o.status === 'sales_order' && o.fulfillmentStatus === 'picked');

    const currentOrders = activeTab === 'pick' ? pickOrders : deliveryOrders;

    const filteredOrders = currentOrders.filter(o => {
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
        const selectedOrdersExec = deliveryOrders.filter(o => selectedOrderIds.includes(o.id) && !o.shippingId);
        if (selectedOrdersExec.length === 0) {
            alert('No pending orders found in selection.');
            return;
        }

        if (!confirm(`Export ${selectedOrdersExec.length} selected orders to Cathedis?`)) return;

        setIsShippingBulk(true);
        let successCount = 0;
        let errors = [];

        for (const order of selectedOrdersExec) {
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
        alert(`Successfully shipped ${successCount}/${selectedOrdersExec.length} orders.`);
        if (errors.length > 0) {
            console.error('Bulk shipping errors:', errors);
            alert(`Some orders failed to ship. Check console for details.`);
        }
        setSelectedOrderIds([]);
        router.refresh();
    };

    const handlePrintPickingLabels = async () => {
        setIsPrinting(true);
        setTimeout(async () => {
            window.print();
            setIsPrinting(false);

            // Mark as printed in the DB
            try {
                await bulkMarkDeliveryNotePrintedAction(selectedOrderIds);
                router.refresh();
            } catch (err) {
                console.error('Failed to update print status:', err);
            }
        }, 100);
    };

    const handleFinishPicking = async () => {
        const selected = pickOrders.filter(o => selectedOrderIds.includes(o.id));
        if (selected.length === 0) return;

        if (!confirm(`Mark ${selected.length} orders as PICKED and move to Deliveries?`)) return;

        setIsUpdatingBulk(true);
        try {
            for (const order of selected) {
                const updatedOrder = {
                    ...order,
                    fulfillmentStatus: 'picked' as const,
                    deliveryNotePrinted: false, // Reset print status for the new stage
                    logs: [
                        { type: 'fulfillment', message: 'Order marked as PICKED', timestamp: new Date().toISOString() },
                        ...(order.logs || [])
                    ]
                };
                await updateOrderAction(updatedOrder);
            }
            alert(`Successfully marked ${selected.length} orders as picked.`);
            setSelectedOrderIds([]);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to update orders');
        } finally {
            setIsUpdatingBulk(false);
        }
    };

    return (
        <div className={styles.tableSection}>
            <div className="no-print">
                <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className={styles.sectionTitle}>Fulfillment Management</h2>
                            <div className={styles.statTrend}>{filteredOrders.length} orders to process</div>
                        </div>

                        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => { setActiveTab('pick'); setSelectedOrderIds([]); }}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'pick' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ClipboardList size={18} />
                                Pick ({pickOrders.length})
                            </button>
                            <button
                                onClick={() => { setActiveTab('deliveries'); setSelectedOrderIds([]); }}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'deliveries' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Truck size={18} />
                                Deliveries ({deliveryOrders.length})
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1" style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search orders..."
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
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedOrderIds(filteredOrders.map(d => d.id));
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
                                <th>{activeTab === 'pick' ? 'Status' : 'Shipping Status'}</th>
                                <th>{activeTab === 'pick' ? 'Picking List' : 'Label'}</th>
                                <th>Manage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
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
                                        {activeTab === 'pick' ? (
                                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase letter-spacing-wider">
                                                Awaiting Picking
                                            </span>
                                        ) : (
                                            order.shippingId ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                        ID: {order.shippingId}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {order.shippingStatus || 'SHIPPED'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 uppercase">
                                                    Awaiting Export
                                                </span>
                                            )
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex justify-center">
                                            {order.deliveryNotePrinted ? (
                                                <div className={`${styles.indicator} ${styles.indicatorPrinted}`} title="Label Printed">
                                                    <CheckCircle size={14} />
                                                    <span className="text-[10px]">PRINTED</span>
                                                </div>
                                            ) : (
                                                <div className={`${styles.indicator} ${styles.indicatorPending}`} title="Not Printed">
                                                    <Circle size={14} className="opacity-50" />
                                                    <span className="text-[10px] italic">PENDING</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className={styles.eyeBtn}
                                            title="View Details"
                                            style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                        <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                        <p className="font-bold text-lg">Empty Queue</p>
                                        <p className="text-sm">No orders currently match this status.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {selectedOrderIds.length > 0 && (
                        <div className={styles.tableSpacer} />
                    )}
                </div>

                {selectedOrder && (
                    <DeliveryDialog
                        order={selectedOrder}
                        products={products}
                        onClose={() => setSelectedOrder(null)}
                        showShippingInterface={activeTab === 'deliveries'}
                    />
                )}

                {/* STICKY BULK ACTION BAR */}
                {selectedOrderIds.length > 0 && (
                    <div className={styles.stickyBar}>
                        <div className="flex items-center gap-4">
                            <div className={styles.selectionBadge}>
                                {selectedOrderIds.length}
                            </div>
                            <div className="hidden sm:block">
                                <div className="font-extrabold text-slate-800 leading-tight text-xs uppercase tracking-wider">Orders Selected</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                    {activeTab === 'pick' ? 'Bulk Preparation' : 'Bulk Export'}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '24px', width: '2px', background: '#f1f5f9', margin: '0 0.5rem' }} />

                        <div className="flex items-center gap-3">
                            {activeTab === 'pick' ? (
                                <>
                                    <button
                                        onClick={handlePrintPickingLabels}
                                        className={styles.bulkShipBtn}
                                        style={{ background: '#334155' }}
                                    >
                                        <Printer size={18} />
                                        <span>Print Picking List</span>
                                    </button>
                                    <button
                                        onClick={handleFinishPicking}
                                        disabled={isUpdatingBulk}
                                        className={styles.bulkShipBtn}
                                        style={{ background: '#2563eb' }}
                                    >
                                        <CheckCircle2 size={18} className={isUpdatingBulk ? 'animate-spin' : ''} />
                                        <span>{isUpdatingBulk ? 'Updating...' : 'Finish Picking'}</span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleBulkShip}
                                    disabled={isShippingBulk}
                                    className={styles.bulkShipBtn}
                                >
                                    <Truck size={18} className={isShippingBulk ? 'animate-spin' : ''} />
                                    <span>{isShippingBulk ? 'Exporting...' : 'Export to Cathedis'}</span>
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedOrderIds([])}
                                className={styles.bulkCloseBtn}
                                title="Cancel Selection"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* PRINT ONLY SECTION */}
            <div className="hidden print:block">
                {isPrinting && (
                    <PickingLabel
                        orders={pickOrders.filter(o => selectedOrderIds.includes(o.id))}
                        products={products}
                    />
                )}
            </div>
        </div>
    );
}
