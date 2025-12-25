'use client';

import { useState, useMemo } from 'react';
import { Product, Kit } from "@/lib/db";
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import SafeImage from './SafeImage';
import styles from '../Admin.module.css';
import ProductActions from './ProductActions';
import ImportProductsDialog from '@/components/ImportProductsDialog';
import { formatCurrency } from '@/lib/format';

interface ProductsViewProps {
    products: Product[];
    kits: Kit[];
    isWooCommerceConnected?: boolean;
}

export default function ProductsView({ products, kits, isWooCommerceConnected }: ProductsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'archived'>('all');
    const [isImporting, setIsImporting] = useState(false);

    const filteredProducts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return products.filter(p => {
            // Status filtering
            if (statusFilter !== 'all') {
                const productStatus = p.status || 'live'; // Default to live if undefined
                if (productStatus !== statusFilter) {
                    return false; // Exclude if status doesn't match filter
                }
            }

            // Search query filtering
            if (searchQuery.trim()) {
                if (!(p.title.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query)))) {
                    return false; // Exclude if search query doesn't match
                }
            }

            return true; // Include if all filters pass
        });
    }, [products, searchQuery, statusFilter]);

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>Products</h2>
                    <div className="flex gap-2 mt-2">
                        {['all', 'live', 'draft', 'archived'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as any)}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    textTransform: 'capitalize',
                                    backgroundColor: statusFilter === status ? '#2563eb' : '#e2e8f0',
                                    color: statusFilter === status ? 'white' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {status === 'live' ? 'Live' : status === 'draft' ? 'In Draft' : status === 'archived' ? 'Archived' : 'All'}
                            </button>
                        ))}
                    </div>
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
                    <div className="flex flex-col gap-2">
                        <Link href="/admin/products/new" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', justifyContent: 'center' }}>
                            <Plus size={18} /> New Product
                        </Link>
                        {isWooCommerceConnected && (
                            <button
                                onClick={() => setIsImporting(true)}
                                className={styles.wooImportBtn}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: '100%' }}
                            >
                                Import from WooCommerce
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isImporting && (
                <ImportProductsDialog
                    onClose={() => setIsImporting(false)}
                    onSuccess={() => { }}
                />
            )}

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
                                                src={product.image || '/default-product.jpg'}
                                                alt={product.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '200px' }}>
                                        <div className={styles.bold} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</div>
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
                                                <div className={styles.bold} style={{ color: '#15803d' }}>{formatCurrency(product.salePrice)}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'line-through' }}>{formatCurrency(product.price)}</div>
                                            </>
                                        ) : (
                                            <div className={styles.bold}>{formatCurrency(product.price)}</div>
                                        )}
                                    </td>
                                    <td>{product.stock || 0} units</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[product.status || 'active'] === styles.pending ? styles.sales_order : styles[product.status || 'active']}`}
                                            style={{
                                                backgroundColor: product.status === 'archived' ? '#f1f5f9' :
                                                    product.status === 'draft' ? '#fef3c7' : '#dcfce7',
                                                color: product.status === 'archived' ? '#64748b' :
                                                    product.status === 'draft' ? '#d97706' : '#166534',
                                                textTransform: 'capitalize',
                                                padding: '2px 8px',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 500
                                            }}>
                                            {product.status === 'live' ? 'Live' : product.status === 'draft' ? 'In Draft' : product.status === 'archived' ? 'Archived' : 'Live'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <ProductActions
                                                productId={product.id}
                                                productStatus={product.status || 'live'}
                                                isLast={index > filteredProducts.length - 3}
                                            />
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
