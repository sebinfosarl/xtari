
import { getKits, getProducts } from '@/lib/db';
import styles from '../../Admin.module.css';
import KitManagerView from './KitManagerView';

export default async function KitManagerPage() {
    const kits = await getKits();
    const products = await getProducts();

    return <KitManagerView kits={kits} products={products} />;
}
