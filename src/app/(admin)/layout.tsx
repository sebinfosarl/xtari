
'use client';

import { useState, useEffect } from 'react';
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
    ChevronDown,
    ShoppingBag,
} from 'lucide-react';
import styles from './AdminLayout.module.css';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>([]);

    useEffect(() => {
        const groups = [];
        if (pathname.startsWith('/admin/products')) groups.push('Products');
        if (pathname.startsWith('/admin/contacts')) groups.push('Contacts');
        setOpenGroups(groups);
    }, [pathname]);

    const toggleGroup = (groupName: string) => {
        setOpenGroups(prev =>
            prev.includes(groupName)
                ? prev.filter(g => g !== groupName)
                : [...prev, groupName]
        );
    };

    const isActive = (path: string) => {
        if (path === '/admin' && pathname === '/admin') return true;
        if (path !== '/admin' && pathname === path) return true;
        return false;
    };

    const isGroupActive = (path: string) => {
        return pathname.startsWith(path);
    };

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        {
            name: 'Products',
            href: '/admin/products',
            icon: Package,
            subItems: [
                { name: 'All Products', href: '/admin/products' },
                { name: 'Categories', href: '/admin/products/categories' },
                { name: 'Brands', href: '/admin/products/brands' },
                { name: 'Attributes', href: '/admin/products/attributes' },
            ]
        },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Fulfillment', href: '/admin/fulfillment', icon: Truck },
        { name: 'Invoices', href: '/admin/invoices', icon: FileText },
        { name: 'Purchase Orders', href: '/admin/purchase', icon: ShoppingBag },
        {
            name: 'Contacts',
            href: '/admin/contacts',
            icon: UserCheck,
            subItems: [
                { name: 'Customers', href: '/admin/contacts/customers' },
                { name: 'Suppliers', href: '/admin/contacts/suppliers' },
            ]
        },
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
                        const isOpen = openGroups.includes(item.name);

                        if (item.subItems) {
                            return (
                                <div key={item.name} className={styles.navGroup}>
                                    <button
                                        onClick={() => toggleGroup(item.name)}
                                        className={`${styles.navItem} ${isGroupActive(item.href) ? styles.navItemActive : ''}`}
                                        style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <Icon size={20} /> {item.name}
                                        <ChevronDown
                                            size={16}
                                            className={`${styles.dropdownIcon} ${isOpen ? styles.dropdownIconOpen : ''}`}
                                        />
                                    </button>

                                    {isOpen && (
                                        <div className={styles.subMenu}>
                                            {item.subItems.map(subItem => (
                                                <Link
                                                    key={subItem.href}
                                                    href={subItem.href}
                                                    className={`${styles.subNavItem} ${isActive(subItem.href) ? styles.subNavItemActive : ''}`}
                                                >
                                                    {subItem.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isGroupActive(item.href) ? styles.navItemActive : ''}`}
                            >
                                <Icon size={20} /> {item.name}
                            </Link>
                        );
                    })}

                    <div className={styles.divider}></div>

                    <Link href="/admin/settings" className={`${styles.navItem} ${isActive('/admin/settings') ? styles.navItemActive : ''}`}>
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
