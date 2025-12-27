
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function checkFile(filename: string) {
    const p = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(p)) {
        console.log(`[${filename}] Not found`);
        return;
    }
    const content = fs.readFileSync(p, 'utf8');
    const parsed = dotenv.parse(content);
    console.log(`[${filename}] Keys found:`);
    Object.keys(parsed).forEach(k => console.log(` - ${k}`));
}

console.log('--- Env Key Listing ---');
checkFile('.env.local');
checkFile('.env');
