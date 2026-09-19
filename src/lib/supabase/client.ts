// src/lib/supabase/client.ts
// Browser Supabase client using @supabase/ssr

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
