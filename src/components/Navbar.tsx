'use client';

import Link from 'next/link';
import { ShoppingBag, Search, Menu } from 'lucide-react';
import styles from './Navbar.module.css';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
    const { items } = useCart();
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.container}`}>
                <div className={styles.mobileOpen}>
                    <Menu size={24} />
                </div>

                <Link href="/" className={styles.logo}>
                    XTARI
                </Link>
                <div className={styles.links}>
                    <Link href="/?cat=ink-printers">Ink & Toners</Link>
                    <Link href="/?cat=printers">Printers</Link>
                    <Link href="/?cat=office-furniture">Furniture</Link>
                    <Link href="/?cat=home-deco">Decoration</Link>
                    <Link href="/?cat=toys">Toys</Link>
                </div>

                <div className={styles.actions}>
                    <button className={styles.iconBtn} aria-label="Search">
                        <Search size={22} />
                    </button>
                    <Link href="/cart" className={styles.iconBtn} aria-label="Cart">
                        <ShoppingBag size={22} />
                        {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
