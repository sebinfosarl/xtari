
'use client';

import { useState } from 'react';
import { Order, Product } from '@/lib/db';
import { Eye, Clock, CheckCircle2, Phone, Calendar, DollarSign, Ban, MessageSquare } from 'lucide-react';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';

interface OrdersViewProps {
    initialOrders: Order[];
    products: Product[];
}

export default function OrdersView({ initialOrders: orders, products }: OrdersViewProps) {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Call Center Dashboard</h2>
                <div className={styles.statTrend}>{orders.length} active orders</div>
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
                        {orders.map(order => (
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
                                        <span className={styles.resultBadge}>{order.callResult}</span>
                                    ) : (
                                        <span className="text-muted text-xs italic">Not called</span>
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
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
}
