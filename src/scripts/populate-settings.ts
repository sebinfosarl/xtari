
import { getSettings, saveSettings } from '@/lib/db';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

async function populate() {
    try {
        console.log('--- Starting Settings Population ---');
        console.log('CWD:', process.cwd());

        // Try .env.local first
        let envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.log('.env.local not found. Checking .env...');
            envPath = path.resolve(process.cwd(), '.env');
        }

        if (fs.existsSync(envPath)) {
            console.log('Loading env from:', envPath);
            dotenv.config({ path: envPath });
        } else {
            console.log('No .env or .env.local found. Relying on process environment.');
        }

        // Also try standard dotenv load as backup
        dotenv.config();

        const url = process.env.WOOCOMMERCE_STORE_URL;
        const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
        const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

        console.log('Loaded URL:', url);
        console.log('Loaded Key:', key ? (key.substring(0, 5) + '...') : 'Missing');
        console.log('Loaded Secret:', secret ? (secret.substring(0, 5) + '...') : 'Missing');

        if (!url || !key || !secret) {
            console.error('❌ Missing credentials in environment variables.');
            return;
        }

        console.log('Fetching current settings from DB...');
        const settings = await getSettings();

        // Update WooCommerce settings
        settings.woocommerce = {
            storeUrl: url,
            consumerKey: key,
            consumerSecret: secret,
            isConnected: true
        };

        console.log('Saving to Supabase...');
        await saveSettings(settings);
        console.log('✅ Settings successfully updated in Supabase!');

    } catch (e) {
        console.error('Error populating settings:', e);
    }
}

populate();
