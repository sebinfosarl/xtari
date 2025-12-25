import { getProducts, getKits, getSettings } from "@/lib/db";
import ProductsView from './ProductsView';

export default async function AdminProductsPage() {
    const products = await getProducts();
    const kits = await getKits();
    const settings = await getSettings();

    return <ProductsView products={products} kits={kits} isWooCommerceConnected={settings.woocommerce?.isConnected} />;
}
