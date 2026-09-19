# Security and Privacy Review & Remediation Checklist

This document tracks the security review findings and completed fixes for **Hajri (LK-Payroll)**.

---

## 1. Tables Without Row Level Security (RLS)
- [x] **`public.system_settings`**: RLS enabled. Stricter tenant/role isolation policies enforced in migration 8.
- [x] **`storage.buckets` & `storage.objects`**: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;` enabled. Policies hardened in migration 8 for `payslips` bucket uploads (restricted to owner/manager/accountant).
- [x] **`public.consents`**: Created in migration 8 with `ENABLE ROW LEVEL SECURITY`. RLS policies enforce that employees only see their own records while owners/managers view org records.
- [x] **`public.erasure_requests`**: Created in migration 8 with `ENABLE ROW LEVEL SECURITY`. Employees can only view/create their own requests; owners review and approve.
- [x] **`public.data_retention_policies`**: Created in migration 8 with `ENABLE ROW LEVEL SECURITY`. Restricted to tenant owners.

---

## 2. Storage Bucket Policies
- [x] **`attendance-selfies` Bucket**:
  - `p_selfies_select`: Restricts photos to owner/manager and respective employee.
  - `p_selfies_insert`: Restricts to authenticated org members uploading to their own org path.
  - `p_selfies_delete`: Restricts deletion to owners and managers.
- [x] **`payslips` Bucket**:
  - `p_payslips_bucket_insert`: Hardened in migration 8 to restrict inserts exclusively to `owner`, `manager`, and `accountant` roles.

---

## 3. Places Where Service-Role Key is Used
- [x] **`supabase/functions/send-payslip/index.ts` (Line 42)**:
  - Validated: Uses service-role key exclusively inside the isolated Edge Function execution environment for authorized batch payroll dispatches. Not bundled into client code.
- [x] **`.env.local`**:
  - Validated: `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix, preventing exposure in browser bundles.

---

## 4. Routes Missing `requireRole` Authorization
- [x] **`src/app/api/cron/cleanup-selfies/route.ts`**:
  - Fixed: Secured with Bearer `CRON_SECRET` authorization and authenticated `owner` role fallback.
- [x] **`src/app/api/cron/retention/route.ts`**:
  - Fixed: Created with Bearer `CRON_SECRET` authorization and authenticated `owner` fallback.
- [x] **`src/app/api/webhooks/whatsapp/route.ts`**:
  - Fixed: `simulate_status` payload branch guarded with session authentication check.
- [x] **`src/app/actions/onboarding.ts`**:
  - Fixed: Requires authenticated session before invoking `create_organization_with_owner`.

---

## 5. Inputs Lacking Strict Validation
- [x] **`src/app/actions/punch.ts`**:
  - Fixed: Validates `photoBase64` size (capped at 5MB) and enforces server-side biometric consent check before accepting punches.
- [x] **`src/app/actions/employees.ts`**:
  - Fixed: Strict input validation on `employment_type`, positive integer `base_wage_paise`, and 10-15 digit `phone` format regex.
- [x] **`src/app/actions/payroll.ts`**:
  - Fixed: Strict regex validation on `periodMonth` format (`^\d{4}-(0[1-9]|1[0-2])$`).

---

## 6. Missing Rate Limits on Sensitive Endpoints
- [x] **Login Endpoint (`loginWithPassword`)**:
  - Fixed: Sliding window rate limit enforced via `src/lib/rateLimit.ts` (max 5 attempts / 15 minutes per email).
- [x] **Signup Endpoint (`signupWithPassword`)**:
  - Fixed: Sliding window rate limit enforced (max 5 attempts / 15 minutes per email).
- [x] **Selfie Punch Endpoint (`submitPunchAction`)**:
  - Fixed: Rate limited to max 10 punch attempts per minute per employee to prevent bucket flooding.
- [x] **Cleanup Cron Endpoint (`/api/cron/cleanup-selfies` & `/api/cron/retention`)**:
  - Fixed: Protected with secret token checks.
