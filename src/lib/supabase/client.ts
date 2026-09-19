// src/lib/supabase/client.ts
// Browser Supabase client using @supabase/ssr

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szbuuaropvszwhibmben.supabase.co';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_WwJxaTofGPcCcYpqrGdaCQ_pWxMDNNm';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
