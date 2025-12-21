
import { getProducts, getOrders } from "@/lib/db";
import {
    TrendingUp,
    Package,
    ShoppingCart,
    Users,
    ArrowUpRight,
    Clock,
    CheckCircle2
} from 'lucide-react';
import styles from '../Admin.module.css';

export default async function AdminDashboard() {
    const products = await getProducts();
    const orders = await getOrders();

    const totalRevenue = orders.reduce((acc, current) => acc + current.total, 0);
    const recentOrders = orders.slice(-5).reverse();

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <div className={`${styles.iconWrapper} ${styles.blue}`}>
                            <TrendingUp size={24} />
                        </div>
                        <span className={styles.statTrend}>+12.5%</span>
                    </div>
                    <div className={styles.statLabel}>Total Revenue</div>
                    <div className={styles.statValue}>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <div className={`${styles.iconWrapper} ${styles.indigo}`}>
                            <ShoppingCart size={24} />
                        </div>
                        <span className={styles.statTrend}>+4.3%</span>
                    </div>
                    <div className={styles.statLabel}>Total Orders</div>
                    <div className={styles.statValue}>{orders.length}</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <div className={`${styles.iconWrapper} ${styles.emerald}`}>
                            <Package size={24} />
                        </div>
                        <span className={styles.statTrend}>-{products.length} Items</span>
                    </div>
                    <div className={styles.statLabel}>Active Products</div>
                    <div className={styles.statValue}>{products.length}</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <div className={`${styles.iconWrapper} ${styles.orange}`}>
                            <Users size={24} />
                        </div>
                        <span className={styles.statTrend}>+2 today</span>
                    </div>
                    <div className={styles.statLabel}>Customers</div>
                    <div className={styles.statValue}>248</div>
                </div>
            </div>

            <div className={styles.mainGrid}>
                <section className={styles.tableSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Recent Orders</h2>
                        <button className={styles.viewAllBtn}>View all <ArrowUpRight size={16} /></button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td className={styles.bold}>#{order.id}</td>
                                        <td>{order.customer.name}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                                                {order.status === 'pending' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>${order.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className={styles.empty}>No recent orders</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className={styles.sideCol}>
                    <section className={styles.cardSection}>
                        <h2 className={styles.sectionTitle}>Quick Actions</h2>
                        <div className={styles.quickActions}>
                            <button className={styles.actionBtn}>New Product</button>
                            <button className={styles.actionBtn}>Export Orders</button>
                            <button className={styles.actionBtn}>Manage Categories</button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
