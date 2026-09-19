// src/app/actions/onboarding.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export interface OnboardingPayload {
  name: string;
  stateCode: string;
  pan?: string;
  firstEmployee?: {
    name: string;
    phone?: string;
    department?: string;
    designation?: string;
    employmentType?: 'monthly' | 'daily' | 'hourly' | 'contract';
  };
}

/**
 * completeOnboardingAction:
 * Creates the organization, org_members with role 'owner', and optional first employee
 * in ONE server-side database transaction via RPC.
 */
export async function completeOnboardingAction(payload: OnboardingPayload) {
  const session = await getSession();
  if (!session) {
    return { error: 'Authentication session required to onboard.' };
  }

  if (!payload.name || !payload.name.trim()) {
    return { error: 'Business name is required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('create_organization_with_owner', {
    p_name: payload.name.trim(),
    p_state_code: payload.stateCode || '27',
    p_pan: payload.pan?.trim() || null,
    p_emp_name: payload.firstEmployee?.name?.trim() || null,
    p_emp_phone: payload.firstEmployee?.phone?.trim() || null,
    p_emp_dept: payload.firstEmployee?.department?.trim() || null,
    p_emp_designation: payload.firstEmployee?.designation?.trim() || null,
    p_emp_type: payload.firstEmployee?.employmentType || 'monthly',
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}
