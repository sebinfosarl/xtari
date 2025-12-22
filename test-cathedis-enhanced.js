// Test script for Cathedis API - Enhanced
// Run with: node test-cathedis-enhanced.js

require('dotenv').config({ path: '.env.local' });

const username = process.env.CATHEDIS_USERNAME;
const password = process.env.CATHEDIS_PASSWORD;

const API_URLS = [
    'https://v1.cathedis.delivery',
    'https://v2.cathedis.delivery',
    'https://cathedis.delivery',
    'https://erp.cathedis.ma'
];

async function testLogin(apiUrl) {
    console.log(`\n🔍 Testing: ${apiUrl}`);

    try {
        const response = await fetch(`${apiUrl}/login.jsp`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                const jsessionid = setCookie.split(';')[0].split('=')[1];
                console.log(`   ✅ SUCCESS! JSESSIONID: ${jsessionid}`);
                console.log(`   \n🎉 Use this URL in your .env.local: ${apiUrl}`);
                return true;
            }
        }

        // Try to read response body
        const text = await response.text();
        if (text.length < 200) {
            console.log(`   Response: ${text}`);
        }

    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    return false;
}

async function runTests() {
    console.log('🔍 Testing Cathedis API Connection...\n');
    console.log('Credentials:');
    console.log('  Username:', username);
    console.log('  Password:', password ? '***' + password.slice(-3) : 'Missing');

    if (!username || !password) {
        console.error('\n❌ Error: Credentials not configured in .env.local');
        return;
    }

    console.log('\nTrying different API endpoints...');

    for (const url of API_URLS) {
        const success = await testLogin(url);
        if (success) {
            break;
        }
    }

    console.log('\n✅ Test complete!');
}

runTests();
