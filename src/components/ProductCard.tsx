'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import styles from './ProductCard.module.css';
import { Product } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import SafeImage from './SafeImage';

export default function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart();

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart(product);
    };

    return (
        <div className={styles.card}>
            <Link href={`/product/${product.id}`} className={styles.imageWrapper}>
                <SafeImage
                    src={product.image}
                    alt={product.title}
                    className={styles.image}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {product.featured && <span className={styles.tag}>Featured</span>}
            </Link>
            <div className={styles.content}>
                <div className={styles.category}>
                    {product.category ? product.category.replace('-', ' ') : 'Uncategorized'}
                </div>
                <Link href={`/product/${product.id}`}>
                    <h3 className={styles.title}>{product.title}</h3>
                </Link>
                <div className={styles.footer}>
                    <span className={styles.price}>{formatCurrency(product.price)}</span>
                    <button
                        className={styles.addBtn}
                        aria-label="Add to Cart"
                        onClick={handleAdd}
                    >
                        <ShoppingCart size={18} /> Add
                    </button>
                </div>
            </div>
        </div>
    );
}
