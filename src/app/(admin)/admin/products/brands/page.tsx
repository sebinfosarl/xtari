import { getBrands } from "@/lib/db";
import BrandsClient from "./BrandsClient";

export default async function BrandsPage() {
    const brands = await getBrands();

    return <BrandsClient brands={brands} />;
}
