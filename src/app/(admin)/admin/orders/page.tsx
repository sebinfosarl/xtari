
import { getOrders } from "@/lib/db";
import { Clock, CheckCircle2, ShoppingCart } from 'lucide-react';
import styles from '../Admin.module.css';

export default async function AdminOrdersPage() {
    const orders = await getOrders();

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Customer Orders</h2>
                <div className={styles.statTrend}>{orders.length} total</div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td className={styles.bold}>#{order.id}</td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customer.email}</div>
                                </td>
                                <td>{new Date(order.date).toLocaleDateString()}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                                        {order.status === 'pending' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                                        {order.status}
                                    </span>
                                </td>
                                <td className={styles.bold}>${order.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
