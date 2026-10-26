import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple parser for .env.local
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('Could not read .env.local:', e.message);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase:', url);
const supabase = createClient(url, key);

async function probe() {
  const tablesToProbe = [
    'profiles', 'posts', 'chat_threads', 'chat_messages', 'deals', 'activities', 'reviews',
    'users', 'todos', 'postingan', 'transaksi', 'notifikasi', 'pesan'
  ];
  
  for (const t of tablesToProbe) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}': [${error.code}] ${error.message}`);
    } else {
      console.log(`Table '${t}': EXISTS (rows returned: ${data.length})`);
    }
  }

  // Also probe RPCs
  const rpcs = ['agree_to_deal', 'revise_deal', 'cancel_deal', 'confirm_activity_completion'];
  for (const r of rpcs) {
    const { data, error } = await supabase.rpc(r, {});
    console.log(`RPC '${r}':`, error ? `[${error.code}] ${error.message}` : 'SUCCESS');
  }

  // Probe auth endpoint
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  console.log('Auth getSession:', sessionErr ? sessionErr.message : (sessionData.session ? 'Active' : 'No active session'));
}

probe();
