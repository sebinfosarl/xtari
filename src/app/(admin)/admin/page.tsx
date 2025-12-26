
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
        <div className={styles.dashboardContainer} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '80vh',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#cbd5e1' }}>COMING SOON</h1>
            <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>This dashboard is under construction.</p>
        </div>
    );
}
