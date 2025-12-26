
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

const QUOTES = [
    "في كل مشكلة تكمن فرصة خفية",
    "في قلب كل صعوبة توجد بذرة من النجاح",
    "لا تنتظر الظروف المثالية؛ اصنع أنت الظروف بفعلك",
    "الفشل هو ببساطة فرصة للبدء من جديد بذكاء أكبر",
    "أكبر خطر في الحياة هو عدم المخاطرة بأي شيء",
    "كلما زادت التحديات، زادت قيمة النجاح عند الوصول",
    "السفينة في الميناء آمنة، لكنها لم تُصنع لتبقى هناك",
    "النمو يبدأ دائماً حيث تنتهي منطقة الراحة الخاصة بك",
    "لا تخشَ التغيير، بل اخشَ البقاء في مكانك للأبد",
    "الاستثمار في المعرفة يحقق دائماً أفضل العوائد",
    "العقل الذي ينفتح على فكرة جديدة لا يعود أبداً إلى أبعاده الأصلية",
    "التعلم هو القوة الوحيدة التي لا يمكن لأحد سلبها منك",
    "ليس من الضروري أن تكون عظيماً لتبدأ، ولكن يجب أن تبدأ لتكون عظيماً",
    "القيادة ليست منصباً، بل هي تأثير وإلهام",
    "التميز ليس فعلاً عابراً، بل هو عادة نمارسها كل يوم",
    "السمعة الجيدة في العمل هي العملة الأغلى التي تمتلكها",
    "لا تبنِ عملاً، بل ابنِ فريقاً، والفريق سيبني العمل",
    "الجودة تعني أن تفعل الشيء الصحيح حتى عندما لا يراقبك أحد",
    "الرؤية بدون تنفيذ هي مجرد حلم، والتنفيذ بدون رؤية هو كابوس",
    "النجاح هو الانتقال من فشل إلى فشل دون فقدان الحماس",
    "الفرق بين المستحيل والممكن يعتمد على عزيمة المرء",
    "لا تتوقف عندما تتعب، توقف عندما تنتهي",
    "العمل الشاق يتفوق على الموهبة عندما لا تعمل الموهبة بجد",
    "الانضباط هو الجسر الذي يربط بين الأهداف والإنجازات",
    "السر في المضي قدماً هو البدء الآن",
    "لا تبحث عن النجاح، بل ابحث عن القيمة، وسوف يتبعك النجاح",
    "الوقت هو رأس مالك الحقيقي، فلا تبدده في معارك ثانوية",
    "من يريد تسلق السلم، عليه أن يبدأ من الدرجة الأولى",
    "التواضع في القمة هو ذروة الرقي، والصبر عند القاع هو منبع القوة",
    "اجعل أثرك جميلاً، فالبصمة لا تموت برحيل صاحبها",
    "السعادة في العمل تضع الكمال في النتيجة النهائية"
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hoveredGroup, setHoveredGroup] = useState<{ name: string; top: number; subItems: any[] } | null>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Quote rotation state (Daily)
    const [quote, setQuote] = useState('');

    useEffect(() => {
        // Calculate index based on days since epoch to ensure daily rotation
        const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
        setQuote(QUOTES[dayIndex % QUOTES.length]);
    }, []);

    // ... existing useEffect ...

    useEffect(() => {
        const groups = [];
        if (pathname.startsWith('/admin/products')) groups.push('Products');
        if (pathname.startsWith('/admin/contacts')) groups.push('Contacts');
        setOpenGroups(groups);
    }, [pathname]);

    // ... existing functions ...

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
                { name: 'Kit Manager', href: '/admin/products/kits' },
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
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
                <button
                    className={styles.collapseBtn}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <ChevronDown size={16} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
                </button>

                <div className={styles.navScrollWrapper}>
                    <div className={styles.brand} style={{
                        padding: isCollapsed ? '3rem 0 1rem 0' : '3rem 1rem 1rem 1rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{ position: 'relative', width: isCollapsed ? '40px' : '200px', height: '80px', transition: 'width 0.2s' }}>
                            <Image
                                src={isCollapsed ? "/favicon.ico" : "/xtari-admin-logo.png"}
                                alt="XTARI AI"
                                fill
                                style={{ objectFit: 'contain' }}
                                priority
                            />
                        </div>
                    </div>

                    <nav className={styles.nav}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isOpen = openGroups.includes(item.name);

                            if (item.subItems) {
                                return (
                                    <div
                                        key={item.name}
                                        className={styles.navGroup}
                                        onMouseEnter={(e) => {
                                            if (isCollapsed) {
                                                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredGroup({
                                                    name: item.name,
                                                    top: rect.top,
                                                    subItems: item.subItems || []
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (isCollapsed) {
                                                closeTimeoutRef.current = setTimeout(() => {
                                                    setHoveredGroup(null);
                                                }, 150);
                                            }
                                        }}
                                    >
                                        <button
                                            onClick={() => !isCollapsed && toggleGroup(item.name)}
                                            className={`${styles.navItem} ${isGroupActive(item.href) ? styles.navItemActive : ''}`}
                                            style={{ background: 'none', border: 'none', width: '100%', cursor: isCollapsed ? 'default' : 'pointer', textAlign: 'left' }}
                                            title={isCollapsed ? item.name : ''}
                                        >
                                            <Icon size={20} />
                                            {!isCollapsed && (
                                                <>
                                                    {item.name}
                                                    <ChevronDown
                                                        size={16}
                                                        className={`${styles.dropdownIcon} ${isOpen ? styles.dropdownIconOpen : ''}`}
                                                    />
                                                </>
                                            )}
                                        </button>

                                        {!isCollapsed && isOpen && (
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
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <Icon size={20} />
                                    {!isCollapsed && item.name}
                                </Link>
                            );
                        })}

                        <div className={styles.divider}></div>

                        <Link href="/admin/settings" className={`${styles.navItem} ${isActive('/admin/settings') ? styles.navItemActive : ''}`} title={isCollapsed ? "Settings" : ""}>
                            <Settings size={20} />
                            {!isCollapsed && "Settings"}
                        </Link>
                    </nav>

                    <div className={styles.sidebarFooter}>
                        <Link href="/" className={styles.navItem} title={isCollapsed ? "Exit Admin" : ""}>
                            <LogOut size={20} />
                            {!isCollapsed && "Exit Admin"}
                        </Link>
                    </div>
                </div>

                {/* Floating Menu Portal */}
                {isCollapsed && hoveredGroup && (
                    <div
                        className={styles.floatingMenu}
                        style={{ top: hoveredGroup.top }}
                        onMouseEnter={() => {
                            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                        }}
                        onMouseLeave={() => {
                            closeTimeoutRef.current = setTimeout(() => {
                                setHoveredGroup(null);
                            }, 150);
                        }}
                    >
                        <div className={styles.floatingMenuHeader}>{hoveredGroup.name}</div>
                        {hoveredGroup.subItems.map(subItem => (
                            <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`${styles.floatingMenuItem} ${isActive(subItem.href) ? styles.floatingMenuItemActive : ''}`}
                                onClick={() => setHoveredGroup(null)}
                            >
                                {subItem.name}
                            </Link>
                        ))}
                    </div>
                )}
            </aside>

            <div className={styles.contentContainer}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        {navItems.find(i => isActive(i.href))?.name || 'Admin'}
                    </div>

                    <div className={styles.headerActions}>
                        <div style={{
                            fontFamily: 'var(--font-cairo)',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            background: 'linear-gradient(to right, #1e293b, #334155)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginRight: '1rem'
                        }}>
                            {quote}
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
