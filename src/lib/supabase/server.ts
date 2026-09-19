// src/lib/supabase/server.ts
// Server-side Supabase client using @supabase/ssr and Next.js cookies

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szbuuaropvszwhibmben.supabase.co';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_WwJxaTofGPcCcYpqrGdaCQ_pWxMDNNm';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be safely ignored if called from Server Component
        }
      },
    },
  });
}
