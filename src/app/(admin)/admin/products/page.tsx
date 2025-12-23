/* eslint-disable @next/next/no-img-element */
import { getProducts } from "@/lib/db";
import { Plus, Package, ExternalLink, MoreVertical, Search, Box } from 'lucide-react';
import Link from 'next/link';
import SafeImage from './SafeImage';
import styles from '../Admin.module.css';
import ProductActions from './ProductActions';

export default async function AdminProductsPage() {
    const products = await getProducts();

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>All Products</h2>
                    <p className={styles.statTrend}>{products.length} products total</p>
                </div>
                <Link href="/admin/products/new" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> New Product
                </Link>
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
                            {products.map((product, index) => (
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
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quick Edit • View Page</div>
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
