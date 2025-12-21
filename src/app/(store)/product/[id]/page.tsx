
import { getProducts } from "@/lib/db";
import ProductDetailView from "@/components/ProductDetailView";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const products = await getProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
        notFound();
    }

    // Get upsells (random other products)
    const upsells = products
        .filter(p => p.id !== id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

    return <ProductDetailView product={product} upsells={upsells} />;
}
