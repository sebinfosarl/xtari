// Test script for Cathedis API
// Run with: node test-cathedis.js

require('dotenv').config({ path: '.env.local' });

const API_URL = process.env.CATHEDIS_API_URL || 'https://v1.cathedis.delivery';
const username = process.env.CATHEDIS_USERNAME;
const password = process.env.CATHEDIS_PASSWORD;

async function testCathedisLogin() {
    console.log('🔍 Testing Cathedis API Connection...\n');

    console.log('Configuration:');
    console.log('  API URL:', API_URL);
    console.log('  Username:', username ? '✓ Set' : '✗ Missing');
    console.log('  Password:', password ? '✓ Set' : '✗ Missing');
    console.log('');

    if (!username || !password) {
        console.error('❌ Error: Credentials not configured in .env.local');
        return;
    }

    try {
        console.log('📡 Attempting login to Cathedis...');
        const response = await fetch(`${API_URL}/login.jsp`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Response Status:', response.status, response.statusText);
        console.log('');

        if (!response.ok) {
            console.error('❌ Login failed!');
            console.error('Status:', response.status);
            try {
                const text = await response.text();
                console.error('Response Body:', text.substring(0, 1000));
            } catch (e) {
                console.error('Could not read response body');
            }
            return;
        }

        // Check for session cookie
        const setCookie = response.headers.get('set-cookie');
        console.log('Set-Cookie header:', setCookie ? '✓ Present' : '✗ Missing');

        if (setCookie) {
            const jsessionid = setCookie.split(';')[0].split('=')[1];
            console.log('JSESSIONID:', jsessionid);
            console.log('');
            console.log('✅ Authentication successful!');
            console.log('');
            console.log('Next steps:');
            console.log('  1. Your credentials are working');
            console.log('  2. You can now test creating a shipment from the admin panel');
        } else {
            console.log('⚠️  Login succeeded but no session cookie received');
        }

        // Try to get response body
        const data = await response.json().catch(() => null);
        if (data) {
            console.log('\nResponse data:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('');
        console.error('Possible issues:');
        console.error('  - Wrong API URL');
        console.error('  - Network/firewall blocking the request');
        console.error('  - Invalid credentials');
    }
}

testCathedisLogin();
