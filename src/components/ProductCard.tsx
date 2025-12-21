'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import styles from './ProductCard.module.css';
import { Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart();

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart(product);
    };

    return (
        <div className={styles.card}>
            <Link href={`/product/${product.id}`} className={styles.imageWrapper}>
                <Image
                    src={product.image}
                    alt={product.title}
                    width={400}
                    height={400}
                    className={styles.image}
                />
                {product.featured && <span className={styles.tag}>Featured</span>}
            </Link>
            <div className={styles.content}>
                <div className={styles.category}>{product.category.replace('-', ' ')}</div>
                <Link href={`/product/${product.id}`}>
                    <h3 className={styles.title}>{product.title}</h3>
                </Link>
                <div className={styles.footer}>
                    <span className={styles.price}>${product.price.toFixed(2)}</span>
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
