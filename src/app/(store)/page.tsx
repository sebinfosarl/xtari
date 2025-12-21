
import { getProducts } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import styles from "../page.module.css";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const allProducts = await getProducts();

  // Filter logic
  const products = cat
    ? allProducts.filter(p => p.category === cat)
    : allProducts;

  const title = cat
    ? `${cat.replace('-', ' ')} Collection`
    : "Curated for Excellence";

  return (
    <main className={styles.main}>
      {/* Hero only on homepage (no category) */}
      {!cat && (
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>Elevate Your Environment</h1>
            <p className={styles.subtitle}>
              Premium office supplies, furniture, and home decor for the modern professional.
            </p>
            <div className={`flex gap-4 justify-center`}>
              <Link href="/?cat=office-furniture" className="btn btn-accent">Shop Furniture</Link>
              <Link href="/?cat=printers" className="btn btn-outline" style={{ borderColor: 'white', color: 'white' }}>Shop Tech</Link>
            </div>
          </div>
        </section>
      )}

      <div className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {cat && <Link href="/" className="btn btn-outline" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>Clear Filter</Link>}
        </div>

        {/* Category Filter Pills */}
        {!cat && (
          <div className={styles.categoryFilters}>
            <Link href="/?cat=ink-printers" className={styles.filterBtn}>Ink & Toners</Link>
            <Link href="/?cat=printers" className={styles.filterBtn}>Printers</Link>
            <Link href="/?cat=office-furniture" className={styles.filterBtn}>Furniture</Link>
            <Link href="/?cat=office-storage" className={styles.filterBtn}>Storage</Link>
            <Link href="/?cat=home-deco" className={styles.filterBtn}>Decor</Link>
            <Link href="/?cat=toys" className={styles.filterBtn}>Toys</Link>
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center" style={{ padding: '4rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>No products found in this category.</h3>
            <Link href="/" className="btn btn-primary">Browse All</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
