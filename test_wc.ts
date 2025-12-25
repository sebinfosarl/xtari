
import { verifyWoocommerceConnection, fetchWoocommerceOrders } from './src/lib/woocommerce';

// Credentials provided by user
const URL = "https://sebinfo.ma/";
const KEY = "ck_36f499f52f654edf67ff12e57df19036eb140bfb";
const SECRET = "cs_8b3aa82ce6b52074438d90ff91873225e8eaaf84";

async function test() {
    console.log("Testing connection...");
    const result = await verifyWoocommerceConnection(URL, KEY, SECRET);
    console.log("Connection result:", result);

    if (result.success) {
        console.log("Fetching orders...");
        try {
            const orders = await fetchWoocommerceOrders(URL, KEY, SECRET);
            console.log(`Fetched ${orders.length} orders.`);
            if (orders.length > 0) {
                console.log("First order ID:", orders[0].id);
                console.log("First order total:", orders[0].total);
            }
        } catch (e: any) {
            console.error("Fetch failed:", e.message);
        }
    }
}

test();
