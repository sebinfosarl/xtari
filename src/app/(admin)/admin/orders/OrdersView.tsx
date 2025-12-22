
'use client';

import { useState } from 'react';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Eye, Clock, CheckCircle2, Phone, Calendar, DollarSign, Ban, MessageSquare } from 'lucide-react';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';

interface OrdersViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
}

export default function OrdersView({ initialOrders: orders, products, salesPeople }: OrdersViewProps) {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'sales_order' | 'no_reply' | 'canceled'>('pending');

    const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>Call Center Dashboard</h2>
                    <div className={styles.statTrend}>{filteredOrders.length} {filter.replace('_', ' ')} orders</div>
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

            {selectedOrder && (
                <OrderDialog
                    order={selectedOrder}
                    products={products}
                    salesPeople={salesPeople}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
}
