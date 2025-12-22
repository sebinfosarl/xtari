import { getProducts, getCategories, getBrands, getAttributes } from '@/lib/db';
import ProductForm from '../../new/ProductForm';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
    // Resolve params promise (Next.js 15+ convention for dynamic routes)
    const { id } = await params;

    const products = await getProducts();
    const product = products.find(p => p.id === id);
    const categories = await getCategories();
    const brands = await getBrands();
    const globalAttributes = await getAttributes();

    if (!product) {
        return <div>Product not found</div>;
    }

    return (
        <ProductForm
            categories={categories}
            brands={brands}
            products={products}
            globalAttributes={globalAttributes}
            initialData={product}
        />
    );
}
