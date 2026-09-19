// src/lib/auth.ts
// Centralized server authorization and context helpers
// Requirement: exports getSession(), getCurrentOrg() and requireRole(roles[]).
// Every server action and route handler calls requireRole first.

import { createClient } from './supabase/server';
import { redirect } from 'next/navigation';

export type UserRole = 'owner' | 'manager' | 'accountant' | 'employee';

export interface OrgContext {
  id: string;
  name: string;
  state_code: string;
  pan?: string | null;
  created_at?: string;
}

export interface MemberContext {
  org_id: string;
  user_id: string;
  role: UserRole;
  employee_id?: string | null;
}

export interface CurrentOrgResult {
  org: OrgContext;
  member: MemberContext;
}

/**
 * getSession():
 * Retrieves current authenticated user session from Supabase server context.
 */
export async function getSession() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return { user, session };
}

/**
 * getCurrentOrg():
 * Returns the organization and member record for the current user.
 * Returns null if the user has not completed onboarding (no org_members record).
 */
export async function getCurrentOrg(): Promise<CurrentOrgResult | null> {
  const sessionResult = await getSession();
  if (!sessionResult) return null;

  const { user } = sessionResult;
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from('org_members')
    .select('org_id, user_id, role, employee_id, organizations (id, name, state_code, pan, created_at)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (error || !member || !member.organizations) {
    return null;
  }

  const org = member.organizations as unknown as OrgContext;

  return {
    org,
    member: {
      org_id: member.org_id,
      user_id: member.user_id,
      role: member.role as UserRole,
      employee_id: member.employee_id,
    },
  };
}

/**
 * requireRole(roles):
 * Verifies that the caller is authenticated, belongs to an organization,
 * and has one of the allowed roles.
 *
 * @throws Error with descriptive message if unauthorized or forbidden.
 */
export async function requireRole(roles: UserRole[]): Promise<{
  user: any;
  org: OrgContext;
  member: MemberContext;
}> {
  const sessionResult = await getSession();
  if (!sessionResult) {
    throw new Error('Unauthorized: Authentication session required');
  }

  const orgContext = await getCurrentOrg();
  if (!orgContext) {
    throw new Error('Onboarding required: No organization associated with this account');
  }

  const { org, member } = orgContext;
  if (!roles.includes(member.role)) {
    throw new Error(
      `Forbidden: Role "${member.role}" does not have sufficient permissions. Required: [${roles.join(', ')}]`
    );
  }

  return {
    user: sessionResult.user,
    org,
    member,
  };
}
