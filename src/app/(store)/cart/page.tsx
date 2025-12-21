
import { getProducts } from "@/lib/db";
import CheckoutView from "@/components/CheckoutView";

export default async function CartPage() {
    const products = await getProducts();
    // Get random products as upsells (excluding cart logic is on client, so just pass some)
    const upsells = products.sort(() => 0.5 - Math.random()).slice(0, 3);

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <CheckoutView upsells={upsells} />
        </main>
    );
}
