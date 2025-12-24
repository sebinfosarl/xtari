import { getProducts, getKits } from "@/lib/db";
import ProductsView from './ProductsView';

export default async function AdminProductsPage() {
    const products = await getProducts();
    const kits = await getKits();

    return <ProductsView products={products} kits={kits} />;
}
