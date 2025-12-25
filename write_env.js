
const fs = require('fs');
const content = 'DATABASE_URL="postgresql://postgres:Sebaghinizar%401.@db.wxpmsbhlynbdeydxrwkv.supabase.co:5432/postgres"';
fs.writeFileSync('.env', content);
console.log('Written .env via node');
