// src/app/actions/auth.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';

export async function loginWithPassword(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Rate limit: 5 attempts per 15 minutes per email
  const limit = checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    const waitMins = Math.ceil(limit.retryAfterMs / 60000);
    return { error: `Too many login attempts. Please wait ${waitMins} minute(s) before trying again.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (!data?.user) {
    return { error: 'Unable to authenticate. Please check your credentials.' };
  }

  // Check if member has an organization
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', data.user.id)
    .limit(1)
    .maybeSingle();

  if (!member?.org_id) {
    redirect('/onboarding');
  }

  redirect('/');
}

export async function signupWithPassword(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Rate limit: 5 signups per 15 minutes per email
  const limit = checkRateLimit(`signup:${email}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    const waitMins = Math.ceil(limit.retryAfterMs / 60000);
    return { error: `Too many signup attempts. Please wait ${waitMins} minute(s) before trying again.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.session) {
    redirect('/onboarding');
  }

  return {
    success: true,
    message: 'Account created! If email confirmation is enabled on your project, please check your inbox to confirm.',
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

