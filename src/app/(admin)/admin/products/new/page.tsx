/* eslint-disable @next/next/no-img-element */
import { getCategories, getBrands, getProducts, getAttributes } from "@/lib/db";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from '../../Admin.module.css';
import ProductForm from './ProductForm';

export default async function EnhancedNewProductPage() {
    const categories = await getCategories();
    const brands = await getBrands();
    const products = await getProducts();
    const globalAttributes = await getAttributes();

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', width: '100%' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href="/admin/products" className={styles.backBtn} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h2 className={styles.sectionTitle}>Create New Product</h2>
                        <p className={styles.statTrend}>Fill in the details to publish a new item</p>
                    </div>
                </div>
            </div>

            <ProductForm categories={categories} brands={brands} products={products} globalAttributes={globalAttributes} />
        </div>
    );
}
