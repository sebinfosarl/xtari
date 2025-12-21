
/* eslint-disable @next/next/no-img-element */
import { getProducts, getCategories } from "@/lib/db";
import { addProductAction, deleteProductAction } from "@/app/actions";
import { Plus, Trash2 } from 'lucide-react';
import styles from '../Admin.module.css';

export default async function AdminProductsPage() {
    const products = await getProducts();
    const categories = await getCategories();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
            <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Product Inventory</h2>
                    <span className={styles.statTrend}>{products.length} products</span>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={product.image} alt="" className={styles.imageCell} />
                                            <span style={{ fontWeight: 600 }}>{product.title}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.statTrend} style={{ textTransform: 'capitalize' }}>
                                            {product.category.replace('-', ' ')}
                                        </span>
                                    </td>
                                    <td className={styles.bold}>${product.price.toFixed(2)}</td>
                                    <td>
                                        <form action={deleteProductAction}>
                                            <input type="hidden" name="id" value={product.id} />
                                            <button className={styles.deleteBtn} aria-label="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <aside className={styles.cardSection}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>Add New Product</h2>
                <form action={addProductAction} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Product Title</label>
                        <input name="title" required className={styles.input} placeholder="e.g. Modern Desk" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Price ($)</label>
                        <input name="price" type="number" step="0.01" required className={styles.input} placeholder="99.99" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <select name="category" className={styles.input}>
                            {categories.map(cat => (
                                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Description</label>
                        <textarea name="description" required className={styles.textarea} rows={4} placeholder="Product details..."></textarea>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Image URL</label>
                        <input name="image" className={styles.input} placeholder="https://images.unsplash.com..." />
                    </div>
                    <button type="submit" className={styles.submitBtn}>
                        <Plus size={18} style={{ marginRight: '0.5rem', marginBottom: '-4px' }} /> Create Product
                    </button>
                </form>
            </aside>
        </div>
    );
}
