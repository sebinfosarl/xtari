'use client';

import { useState, useMemo } from 'react';
import { Product, Kit } from "@/lib/db";
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import SafeImage from './SafeImage';
import styles from '../Admin.module.css';
import ProductActions from './ProductActions';

interface ProductsViewProps {
    products: Product[];
    kits: Kit[];
}

export default function ProductsView({ products, kits }: ProductsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(p =>
            p.title.toLowerCase().includes(query) ||
            (p.sku && p.sku.toLowerCase().includes(query))
        );
    }, [products, searchQuery]);

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>All Products</h2>
                    <p className={styles.statTrend}>{filteredProducts.length} filtered / {products.length} total</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={styles.searchBarWrapper} style={{ width: '300px', margin: 0 }}>
                        <Search className={styles.searchIcon} size={20} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
                        />
                    </div>
                    <Link href="/admin/products/new" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                        <Plus size={18} /> New Product
                    </Link>
                </div>
            </div>

            <div className={styles.tableSection}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th>Price</th>
                                <th>In Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product, index) => (
                                <tr key={product.id}>
                                    <td>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                                            <SafeImage
                                                src={product.image}
                                                alt={product.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.bold}>{product.title}</div>
                                        {kits.some(k => k.targetProductId === product.id) && (
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    backgroundColor: '#9333ea', // Purple-600
                                                    borderRadius: '2px',
                                                    boxShadow: '0 0 5px rgba(147, 51, 234, 0.6)',
                                                    letterSpacing: '0.05em',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    KIT
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td><code>{product.sku || 'N/A'}</code></td>
                                    <td>
                                        {product.salePrice ? (
                                            <>
                                                <div className={styles.bold} style={{ color: '#15803d' }}>${product.salePrice}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'line-through' }}>${product.price}</div>
                                            </>
                                        ) : (
                                            <div className={styles.bold}>${product.price}</div>
                                        )}
                                    </td>
                                    <td>{product.stock || 0} units</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles.sales_order}`}>Live</span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <ProductActions productId={product.id} isLast={index === products.length - 1} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
