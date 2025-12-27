
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import fs from 'fs';

async function check() {
    const { data } = await supabase.from('Settings').select('cathedis').single();
    let output = '';
    if (!data || !data.cathedis) {
        output = 'NO_CATHEDIS_DATA';
    } else {
        output += `USER: ${data.cathedis.username || 'EMPTY'}\n`;
        output += `PASS_LEN: ${data.cathedis.password ? data.cathedis.password.length : 0}\n`;
        output += `CONNECTED: ${data.cathedis.isConnected}\n`;
    }
    fs.writeFileSync('inspect-output.txt', output);
}

check();
