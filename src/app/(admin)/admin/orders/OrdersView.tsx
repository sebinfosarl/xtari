
'use client';

import { useState } from 'react';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Eye, Clock, CheckCircle2, Phone, Calendar, DollarSign, Ban, MessageSquare, Plus, Truck, RefreshCw } from 'lucide-react';
import { requestPickupAction, refreshShipmentStatusAction } from '@/app/actions';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';
import NewOrderDialog from '@/components/NewOrderDialog';

interface OrdersViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
}

export default function OrdersView({ initialOrders: orders, products, salesPeople }: OrdersViewProps) {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'sales_order' | 'no_reply' | 'canceled'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
    const [isRequestingPickup, setIsRequestingPickup] = useState(false);
    const [isSyncingShipping, setIsSyncingShipping] = useState(false);

    const filteredOrders = orders.filter(o => {
        // Status filter
        if (filter !== 'all' && o.status !== filter) return false;

        // Search query filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesId = o.id.toLowerCase().includes(q);
            const matchesName = o.customer.name.toLowerCase().includes(q);
            const matchesPhone = o.customer.phone.toLowerCase().includes(q);
            if (!matchesId && !matchesName && !matchesPhone) return false;
        }

        // Date range filter
        if (startDate || endDate) {
            const orderDate = new Date(o.date).setHours(0, 0, 0, 0);
            if (startDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                if (orderDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate).setHours(23, 59, 59, 999);
                if (orderDate > end) return false;
            }
        }
        return true;
    });

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        <div>
                            <h2 className={styles.sectionTitle}>Call Center Dashboard</h2>
                            <div className={styles.statTrend}>{filteredOrders.length} {filter.replace('_', ' ')} orders</div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {(['pending', 'sales_order', 'no_reply', 'canceled', 'all'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                        >
                            {f.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* ADVANCED FILTER BAR */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '1rem',
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    alignItems: 'center'
                }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search by ID, Name or Phone..."
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
                            <MessageSquare size={16} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                padding: '0.6rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                padding: '0.6rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Call Result</th>
                            <th>Manage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td className={styles.bold}>#{order.id}</td>
                                <td>
                                    <div className={styles.resultBadge}><Calendar size={12} /> {new Date(order.date).toLocaleDateString()}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}><Phone size={10} style={{ display: 'inline', marginRight: '2px' }} /> {order.customer.phone || 'No phone'}</div>
                                </td>
                                <td className={styles.bold}>${order.total.toFixed(2)}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                                        {order.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    {order.callResult ? (
                                        <div className="flex flex-col gap-1">
                                            <span className={styles.resultBadge}>{order.callResult}</span>
                                            {order.invoiceDownloaded && (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                    INVOICE ↓
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-muted text-xs italic">Not called</span>
                                            {order.invoiceDownloaded && (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                    INVOICE ↓
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className={styles.eyeBtn}
                                        title="View Details"
                                    >
                                        <Eye size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {
                selectedOrder && (
                    <OrderDialog
                        order={selectedOrder}
                        products={products}
                        salesPeople={salesPeople}
                        onClose={() => setSelectedOrder(null)}
                    />
                )
            }
            {
                showNewOrderDialog && (
                    <NewOrderDialog
                        products={products}
                        salesPeople={salesPeople}
                        onClose={() => setShowNewOrderDialog(false)}
                    />
                )
            }

            {/* FLOATING ACTION BUTTON */}
            <button
                className={styles.fab}
                onClick={() => setShowNewOrderDialog(true)}
                title="Create New Order"
            >
                <Plus size={32} />
            </button>
        </div>
    );
}
