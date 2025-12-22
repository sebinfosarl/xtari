
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Settings,
    LogOut,
    User,
    Bell,
    Search,
    Users,
    FileText,
    UserCheck,
    Truck,
} from 'lucide-react';
import styles from './AdminLayout.module.css';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/admin' && pathname === '/admin') return true;
        if (path !== '/admin' && pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Deliveries', href: '/admin/deliveries', icon: Truck },
        { name: 'Invoices', href: '/admin/invoices', icon: FileText },
        { name: 'Contacts', href: '/admin/contacts', icon: UserCheck },
        { name: 'Sales Team', href: '/admin/sales', icon: Users },
    ];

    return (
        <div className={styles.adminContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    XTARI ADMIN
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                            >
                                <Icon size={20} /> {item.name}
                            </Link>
                        );
                    })}

                    <div className={styles.divider}></div>

                    <Link href="/admin/settings" className={styles.navItem}>
                        <Settings size={20} /> Settings
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link href="/" className={styles.navItem}>
                        <LogOut size={20} /> Exit Admin
                    </Link>
                </div>
            </aside>

            <div className={styles.contentContainer}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        {navItems.find(i => isActive(i.href))?.name || 'Admin'}
                    </div>

                    <div className={styles.headerActions}>
                        <div style={{ color: '#64748b' }}><Search size={20} /></div>
                        <div style={{ color: '#64748b' }}><Bell size={20} /></div>
                        <div className={styles.userProfile}>
                            <div className={styles.avatar}>AD</div>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Admin User</span>
                        </div>
                    </div>
                </header>

                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
