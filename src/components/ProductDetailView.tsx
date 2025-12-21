'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Star, Check } from 'lucide-react';
import { Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import styles from './ProductDetail.module.css';
import Link from 'next/link';

export default function ProductDetailView({ product, upsells }: { product: Product, upsells: Product[] }) {
    const { addToCart } = useCart();
    const [added, setAdded] = useState(false);

    const handleAdd = () => {
        addToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                <div className={styles.imageSection}>
                    <Image
                        src={product.image}
                        alt={product.title}
                        width={600}
                        height={600}
                        className={styles.mainImage}
                        priority
                    />
                </div>

                <div className={styles.infoSection}>
                    <div className={styles.category}>{product.category.replace('-', ' ')}</div>
                    <h1 className={styles.title}>{product.title}</h1>
                    <div className={styles.price}>${product.price.toFixed(2)}</div>

                    <div className={styles.description}>
                        <p>{product.description}</p>
                        <p>Experience premium quality tailored for your professional lifestyle. This product has been curated to meet the highest standards of durability and aesthetics.</p>
                    </div>

                    <div className={styles.actions}>
                        <button
                            onClick={handleAdd}
                            className={`${styles.addBtn} ${added ? styles.added : ''}`}
                        >
                            {added ? <Check size={20} /> : <ShoppingCart size={20} />}
                            {added ? 'Added to Cart' : 'Add to Cart'}
                        </button>
                    </div>

                    <div className={styles.features}>
                        <div className={styles.featureItem}><Check size={16} className="text-green-500" /> Premium Materials</div>
                        <div className={styles.featureItem}><Check size={16} className="text-green-500" /> 2 Year Warranty</div>
                        <div className={styles.featureItem}><Check size={16} className="text-green-500" /> Free Shipping</div>
                    </div>
                </div>
            </div>

            <div className={styles.upsellSection}>
                <h3 className={styles.sectionTitle}>Frequently Bought Together</h3>
                <div className={styles.upsellGrid}>
                    {upsells.map(p => (
                        <Link key={p.id} href={`/product/${p.id}`} className={styles.upsellCard}>
                            <Image src={p.image} alt={p.title} width={200} height={200} className={styles.upsellImage} />
                            <div className={styles.upsellInfo}>
                                <p className={styles.upsellTitle}>{p.title}</p>
                                <p className={styles.upsellPrice}>${p.price}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
