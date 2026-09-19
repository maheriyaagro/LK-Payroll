# Hajri (LK-Payroll) — Project Documentation

**Hajri** is a modern, mobile-first payroll, attendance, and workforce management platform built specifically for Indian businesses, MSMEs, construction sites, manufacturing units, and contractors with mixed employment models.

---

## 1. Project Overview & Vision

Managing attendance (*hajri*), advances, overtime, and salary calculations for diverse Indian workforces is historically fragmented across paper registers, Excel sheets, and complex legacy software. 

Hajri unifies:
- **Daily Hajri / Attendance**: 1-tap bulk marking, shift status tracking (`P`, `A`, `H`, `L`, `W`, `OT`), and overtime hours.
- **Mixed Employment Types**: Native support for Monthly salaried, Daily wage (*dihaadi*), Hourly equipment operators, and Contract retainers.
- **Advance & Loan EMI Recovery**: Automatic tracking and deduction of employee advances.
- **Transparent Payslips**: Itemized earnings and deductions with expandable, plain-language calculation explainers (*"why?"*).
- **Enterprise-Grade Database Architecture**: PostgreSQL schema with Row Level Security (RLS), immutability triggers, and paise-precision monetary accounting.

---

## 2. Technology Stack

### Frontend & Application Layer
- **Framework**: [Next.js 16.3.5](https://nextjs.org/) (App Router, Turbopack)
- **Library**: [React 19.2.8](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS design system tokens
- **Typography & Theme**: Dark mode theme with sleek glassmorphism, accent highlights (`#FE5733`), and tabular numerals (`font-feature-settings: "tnum"`)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend & Database Layer
- **Database Engine**: [Supabase](https://supabase.com/) / PostgreSQL 15+
- **Security**: Row Level Security (RLS) with tenant isolation and employee role-based access control
- **Integrity**: PL/pgSQL database triggers enforcing immutability on approved runs and append-only audit logs
- **Accounting Precision**: Strict `BIGINT` paise currency storage (1 INR = 100 paise; no floating-point rounding errors)

### Testing & Verification
- **In-Memory PostgreSQL Engine**: [`@electric-sql/pglite`](https://pglite.dev/) (WASM-based Postgres engine running in Node.js)
- **Test Suite**: Automated RLS and migration verification suite testing cross-tenant isolation and role-based permissions

---

## 3. Directory Structure

```
LK-Payroll/
├── .github/                       # GitHub repository configuration
├── middleware.ts                  # Root Next.js route protection middleware
├── src/
│   ├── middleware.ts              # App router route protection middleware (session & org checks)
│   ├── app/
│   │   ├── (app)/                 # Authenticated & Onboarded route group
│   │   │   ├── page.tsx           # Owner / Manager Dashboard (Hero card, stats, live tabs)
│   │   │   ├── attendance/        # Daily Hajri marking (7-day date strip, card controls)
│   │   │   │   └── page.tsx
│   │   │   ├── payroll/           # Payroll runs overview & employee list
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/          # Detailed payslip with plain-language calculation explainers
│   │   │   │       └── page.tsx
│   │   │   └── employees/
│   │   │       └── new/           # Add Employee screen with live avatar preview
│   │   │           └── page.tsx
│   │   ├── actions/               # Server Actions
│   │   │   ├── auth.ts            # Password / OTP sign-in, sign-up, sign-out actions
│   │   │   └── onboarding.ts      # Atomic organization onboarding action
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── signout/       # Route handler for form-based signout
│   │   ├── login/                 # Mobile-first auth screen (Email+Password and Phone OTP)
│   │   │   └── page.tsx
│   │   ├── signup/                # Signup screen (Email+Password and Phone OTP)
│   │   │   └── page.tsx
│   │   ├── onboarding/            # 3-step organization onboarding wizard
│   │   │   └── page.tsx
│   │   ├── globals.css            # Design tokens, color palette, responsive utilities
│   │   └── layout.tsx             # Root app layout with responsive shell
│   ├── components/
│   │   ├── home/                  # Dashboard components (HeroCard, StatCard, EmployeeList)
│   │   └── shell/                 # Navigation shell (SideNav for desktop, BottomNav for mobile, TopBar)
│   ├── engine/                    # Pure TypeScript payroll calculation engine
│   └── lib/
│       ├── auth.ts                # Auth helpers (getSession, getCurrentOrg, requireRole)
│       ├── mock.ts                # Realistic Indian mock data (names, roles, wages, attendance)
│       ├── nav-config.ts          # Centralized navigation configuration
│       └── supabase/
│           ├── client.ts          # Browser Supabase client
│           └── server.ts          # Server Supabase client (cookies)
├── supabase/
│   ├── migrations/
│   │   ├── 20260919000001_create_payroll_schema.sql  # 11 tables, constraints, org_id indexes
│   │   ├── 20260919000002_create_triggers.sql        # Lock triggers & audit log immutability
│   │   ├── 20260919000003_create_rls_policies.sql    # Tenant isolation & role RLS policies
│   │   └── 20260919000004_auth_and_onboarding.sql    # Atomic onboarding RPC & approval role trigger
│   └── seed.sql                   # 1 org, 12 mixed-type employees, 2 months attendance
├── tests/
│   ├── engine/                    # Engine unit and golden test suite
│   └── rls/
│       ├── run-tests.js           # Executable test runner (pglite)
│       └── rls.test.ts            # TypeScript RLS test harness
├── build.js                       # Cross-platform build script with FAT32 / Vercel detection
├── dev.js                         # Local dev server with live NTFS mirror synchronization
├── package.json                   # Dependencies, scripts, and build metadata
├── tsconfig.json                  # TypeScript compiler options
└── project.md                     # Complete project architecture and documentation
```

---

## 4. Key Screens & Features

### 1. Authentication & Onboarding
- **Login (`/login`) & Signup (`/signup`)**:
  - Dual authentication modes: **Email + Password** and **Phone OTP** (using 6-digit verification).
  - Clean, dark-mode design styled strictly with existing tokens (`globals.css`).
- **3-Step Organization Onboarding (`/onboarding`)**:
  - **Step 1**: Business Name & Indian State Selection (dropdown with GST/PT state codes).
  - **Step 2**: PAN (Permanent Account Number) - Optional with format validation.
  - **Step 3**: First Employee Details - Optional & skippable (*"Skip staff for now & Finish"*).
  - **Atomic Transaction**: Calls `create_organization_with_owner()` PostgreSQL RPC to create `organizations`, `org_members` with role `'owner'`, and optional first employee in one transaction.
- **Route Protection Middleware**:
  - Unauthenticated users attempting to access `(app)` are redirected to `/login`.
  - Authenticated users without an organization are redirected to `/onboarding`.
  - Authenticated and onboarded users visiting `/login` or `/signup` are automatically redirected to `/`.

### 2. Owner Home Dashboard (`/`)
- **Header**: Personalized greeting, business name, user avatar, and notifications indicator.
- **Hero Card**: Financial anchor card featuring current month payroll total (Indian formatting: `₹4,82,500`), delta badge (`+6.2%`), period chip, and direct primary action buttons:
  - *"Mark hajri"* (Primary accent button)
  - *"Run payroll"* (Surface button)
- **Live Metrics**: Grid of metric cards showing today's attendance summary (Present count) and total outstanding salary advances.
- **Workforce Attendance Roster**:
  - Filter chips: *Today*, *Late*, *Absent*, *On leave*.
  - Responsive presentation: Mobile tap-friendly cards on small screens, structured data table on desktop.

### 3. Daily Attendance / Hajri (`/attendance`)
- **7-Day Date Strip**: Horizontal swipeable date selector with today highlighted as an active solid accent pill.
- **Summary Counters**: Live count badges for *Present*, *Absent*, *Half-day*, and *Overtime hours*.
- **Bulk Action**: 1-tap *"Mark all present"* button to accelerate morning check-ins.
- **Worker Cards**: Individual employee cards with avatar, designation, and responsive segmented status control:
  - `P` (Present)
  - `H` (Half-day)
  - `A` (Absent)
  - `OT` (Overtime)
- **Live Floating Status Dock**: Displays real-time marked status (*"23 marked, 5 pending"*) with a *"Save"* button that updates instantly as statuses toggle.

### 4. Payroll Management (`/payroll` & `/payroll/[id]`)
- **Month Selector & Status Banner**: Period chips with status badge (*Draft*, *Review*, *Approved*) and approval action button.
- **Roster Pay Overview**: Right-aligned net wages in tabular figures with a *"why?"* explainer trigger below each amount.
- **Payslip Detail (`/payroll/[id]`)**:
  - Employee header with trade code and masked bank account.
  - Large net salary hero card.
  - Itemized Earnings & Deductions breakdown with running subtotals in accent color.
  - **Plain-Language Explainers**: Expandable breakdown providing plain-text calculation transparency (e.g., *"35,000 monthly rate for 26 payable days"*, *"Statutory 12% capped at ₹1,800"*, *"Monthly EMI recovery for June festival advance"*).
  - One-tap sharing: WhatsApp share button & PDF export button.

### 5. Add Employee (`/employees/new`)
- Mobile-optimized form with dynamic avatar initials generator.
- Employment type selector (Monthly salaried, Daily wage, Hourly operator, Contract consultant).
- Comprehensive fields for Department, Designation, Joining date, Mobile number, PF UAN, ESI Insurance Number, and Bank details.

### 6. Responsive Shell
- **Desktop (≥768px)**: Fixed left sidebar (`SideNav`) with brand identity, direct page links, user profile with sign-out, and high-visibility *"Add Employee"* button.
- **Mobile (<768px)**: Floating capsule dock (`BottomNav`) centered above the screen edge with active pill animation, quick actions, and the `+ Add` button in the final dock slot.

---

## 5. Authentication & Authorization Architecture (`src/lib/auth.ts`)

- `getSession()`: Retrieves current active session and user from Supabase cookies via server client.
- `getCurrentOrg()`: Resolves the user's primary organization and active role from `org_members`.
- `requireRole(allowedRoles: UserRole[])`: Enforces role-based gatekeeping in server actions and route handlers. Rejects unauthorized access with `Error('Unauthorized: insufficient permissions')`.
- Trigger-Enforced Approval: Database trigger `trg_payroll_approval_role_check` guarantees that only an `'owner'` can approve or pay a payroll run, rejecting attempts by `'manager'` or `'employee'`.

---

## 6. Payroll Calculation Engine (`src/engine`)

Hajri includes an industrial-grade, pure TypeScript payroll calculation engine designed for Indian regulatory compliance, multi-tier compensation models, and extreme precision.

### Architecture & Constraints
- **Zero Framework Coupling**: Pure TypeScript with no React, Next.js, or Supabase imports.
- **Strict Integer Arithmetic**: All monetary values are integer `bigint` paise (`100n paise = ₹1.00`). Floating-point arithmetic (`Math.round`, `/` resulting in float) is strictly forbidden.
- **Commercial Half-Up Rounding Rule**: Rounding is applied exactly once per evaluated component using `roundPaise(numerator, denominator)`:
  $$\lfloor \frac{\text{num} + \text{sign} \cdot \lfloor \text{den} / 2 \rfloor}{\text{den}} \rfloor$$
- **Pure & Deterministic**: No `Date.now()`, no file/network I/O, deterministic output for any given input.
- **Audit Transparency**: Every function producing a money figure attaches an `explain` string in plain English detailing the exact inputs and arithmetic.
- **Topological Evaluation**: Dynamically sorts salary components using Depth-First Search (DFS) with 3-state cycle detection, preventing circular references (`A -> B -> A`) and throwing explicit errors for missing dependency codes.
- **Employment Models**:
  - `monthly`: Pro-rated based on payable days (`Present`, `Holiday`, `Weekly Off`, and `Half-day` as 0.5) over `daysInMonth`. Supports mid-month joiners (`doj`) and leavers (`dol`).
  - `daily`: Paid on total payable days worked plus overtime minutes.
  - `hourly`: Paid on total worked minutes plus overtime minutes.
  - `contract`: Fixed retainer with LOP deductions.
- **Advance Recovery Protection**: Automatic recovery of employee advances clamped so net pay is never negative (`netPaise >= 0n`).

### File Overview
- [`src/engine/types.ts`](file:///g:/LK-Payroll/src/engine/types.ts): Input contracts (`PayrollInput`, `EmployeeInput`, `Period`, `SalaryComponentInput`, `AdvanceInput`) and output types (`PayrollResult`, `PayrollLine`, `AdvanceRecoveryResult`).
- [`src/engine/attendance.ts`](file:///g:/LK-Payroll/src/engine/attendance.ts): Pure attendance aggregation computing centi-days (`100n` centi-days per day, `50n` per half-day) without floats.
- [`src/engine/components.ts`](file:///g:/LK-Payroll/src/engine/components.ts): Topological dependency resolution, `roundPaise()` implementation, and component evaluation.
- [`src/engine/calculate.ts`](file:///g:/LK-Payroll/src/engine/calculate.ts): Single entry point `calculatePayroll(input)` aggregating gross, statutory deductions, advance recoveries, compliance warnings, and payslip lines.
- [`src/engine/statutory.ts`](file:///g:/LK-Payroll/src/engine/statutory.ts): Pure statutory calculators `pf()`, `esi()`, `pt()`, and `tds()` stub generating line items with explain strings.
- [`src/engine/validators.ts`](file:///g:/LK-Payroll/src/engine/validators.ts): `wageCodeCheck()` checking Section 2(y) 50% remuneration threshold (warning only, non-mutating).
- [`src/engine/rules/loader.ts`](file:///g:/LK-Payroll/src/engine/rules/loader.ts): Deterministic rule loader matching active versions on or before `period.startDate`. Never falls back silently.
- [`src/engine/rules/in/`](file:///g:/LK-Payroll/src/engine/rules/in/): Versioned statutory rule packs marked `"verify_with_ca": true`:
  - [`pf.json`](file:///g:/LK-Payroll/src/engine/rules/in/pf.json): 12% EE / 12% ER, ₹15,000 ceiling on Basic + DA.
  - [`esi.json`](file:///g:/LK-Payroll/src/engine/rules/in/esi.json): 0.75% EE / 3.25% ER, ₹21,000 gross ceiling (not applicable above ceiling).
  - [`pt-mh.json`](file:///g:/LK-Payroll/src/engine/rules/in/pt-mh.json): Maharashtra PT with empty slabs `[]` awaiting CA verification.

---

## 7. Database Schema & Architecture

### Monetary Rule
Every single monetary column uses `BIGINT` representing amounts in **paise** (`1 INR = 100 paise`). Floating-point types (`float`, `numeric`, `decimal`) are strictly banned across the entire schema.

### Tables & Relationships

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `organizations` | Tenant organization root | `id`, `name`, `pan`, `tin`, `address`, `state_code`, `created_at` |
| `org_members` | Organization membership & roles | `org_id`, `user_id`, `role` (`owner`, `manager`, `accountant`, `employee`), `employee_id` |
| `employees` | Worker master directory | `id`, `org_id`, `code`, `name`, `phone`, `doj`, `dol`, `department`, `designation`, `employment_type`, `pf_uan`, `esi_ic`, `bank_account_masked`, `is_active` |
| `salary_structures` | Versioned pay structure | `id`, `org_id`, `employee_id`, `effective_from`, `effective_to` |
| `salary_components` | Breakdown items per structure | `id`, `org_id`, `structure_id`, `code`, `label`, `kind` (`earning`, `deduction`, `employer_cost`), `calc_type`, `amount_paise`, `percent_of_code`, `is_statutory` |
| `attendance_records` | Daily shift logs | `id`, `org_id`, `employee_id`, `work_date`, `status` (`P`, `A`, `H`, `L`, `W`, `OT`), `in_at`, `out_at`, `worked_minutes`, `ot_minutes`, `source`, `marked_by` |
| `advances` | Salary advance loans & EMIs | `id`, `org_id`, `employee_id`, `amount_paise`, `given_on`, `recovery_per_month_paise`, `balance_paise` |
| `payroll_runs` | Monthly payroll batches | `id`, `org_id`, `period_month`, `status` (`draft`, `review`, `approved`, `paid`, `reversed`), `locked_at`, `approved_by`, `reversal_of_id`, `reversed_at` |
| `payroll_items` | Employee payslip summaries | `id`, `org_id`, `run_id`, `employee_id`, `gross_paise`, `deductions_paise`, `net_paise`, `days_paid`, `snapshot` |
| `payroll_item_lines` | Itemized line calculations | `id`, `org_id`, `item_id`, `component_code`, `label`, `kind`, `amount_paise`, `explain` |
| `audit_log` | Immutable audit trail | `id`, `org_id`, `actor_id`, `entity`, `entity_id`, `action`, `before`, `after`, `at` |

---

## 8. Payroll Run Lifecycle & Pre-Run Checks

The payroll lifecycle enforces strict, finite state transitions with full snapshot reproducibility, automatic attendance locking, compliance guardrails, and non-destructive reversal:

```
[draft] ──(prepare)──> [review] ──(owner approve)──> [approved] ──(disburse)──> [paid]
                                                           │                        │
                                                           └───(non-destructive)────┘
                                                                       │
                                                                       ▼
                                                          [new run: 'reversed']
```

### 1. State Transitions & Rules
- **Explicit Transitions Only**: `draft -> review -> approved -> paid`, and `approved | paid -> reversed`. Any other transition throws immediately.
- **Audit Logging**: Every single transition appends an `audit_log` row with before/after state and actor tracking.
- **Snapshot Reproducibility**: `createDraftRun` executes the pure calculation engine for every active worker and saves the entire `PayrollInput` as serialized JSONB in `payroll_items.snapshot`, allowing exact reproduction of any figure later.
- **Pre-Run Checks**: Transitioning to `approved` evaluates 6 essential operational checks:
  1. *Unmarked Attendance* (Error): Attendance not marked for any working day.
  2. *Negative/Zero Net Pay* (Error): Net pay is $\le 0$ for a monthly employee.
  3. *Net Pay Variance* (Warning): Net pay varies by $> 25\%$ compared to previous month.
  4. *Duplicate Bank Accounts* (Error): Duplicate bank account detected across multiple employees.
  5. *Wage Code Breach* (Warning): Basic + DA falls below 50% under Section 2(y).
  6. *Negative Advance Balance* (Error): Advance recovery exceeds remaining balance.
  *Note: Any error strictly blocks approval. Warnings require individual or bulk tick-box acknowledgment.*
- **Attendance Locking**: Transition to `approved` sets `locked_at = now()`. The database trigger `trg_attendance_lock_check` strictly rejects any `UPDATE` or `DELETE` on attendance records within an approved or paid month.
- **Non-Destructive Reversal**: Reversing an approved or paid run never mutates or deletes the original run. It creates a linked reversal run (`reversal_of_id`) with negated `payroll_items` and `payroll_item_lines`. Both original and reversal runs remain permanently visible in the audit trail.

---

## 9. Security, RLS & Triggers

### 1. Row Level Security (RLS)
- **Tenant Isolation**: A user only has access to rows where `org_id` matches an organization they belong to in `org_members`. Cross-organization access returns **0 rows**.
- **Unassigned User Isolation**: A user with no `org_members` row reads **0 rows everywhere across all 11 tables**.
- **Role 'employee' Isolation**: Users with the `'employee'` role can exclusively query rows associated with their own `employee_id`. They receive **0 rows** when querying colleagues' payroll items, attendance records, advances, or payslips.
- **Manager & Owner Access**: Roles `'owner'`, `'manager'`, and `'accountant'` have visibility across all workers in their organization.

### 2. Business Integrity Triggers
- **Approved Run Locking**: Once a `payroll_runs` record transitions to `'approved'` or `'paid'`, database triggers block any subsequent `UPDATE` or `DELETE` operations on associated `payroll_items` or `payroll_item_lines`.
- **Attendance Locking Trigger**: Trigger `trg_attendance_lock_check` blocks edits or deletions on `attendance_records` if the corresponding month's payroll run is in status `'approved'` or `'paid'`.
- **Payroll Approval Role Restriction**: Trigger `trg_payroll_approval_role_check` blocks any user other than an `'owner'` from transitioning a run to `'approved'` or `'paid'`. A `'manager'` attempting approval is rejected with an exception.
- **Lock Timestamping**: Transition to `'approved'` automatically records `locked_at = now()`.
- **Append-Only Audit Log**: Database triggers and RLS policies prevent `UPDATE` and `DELETE` on `audit_log` by anyone, ensuring complete audit immutability.

---

## 9. Testing & Verification

The project includes two automated test suites:

### 1. Database RLS & Schema Tests
Powered by PGlite (WASM PostgreSQL).
```bash
npm run test:rls
```
**47/47 Passing Tests (100%)**:
- Migration Pipeline & Seeding
- Cross-Tenant Isolation
- Role 'employee' Isolation
- Unassigned User Isolation (zero rows across all 11 tables)
- Manager Approval Rejection & Owner Approval Success
- Atomic Onboarding Transaction RPC
- Trigger Enforcement & Audit Immutability

### 2. Pure Payroll Engine & Statutory Tests
Powered by standalone in-memory TypeScript runner.
```bash
npm run test:engine
```
- **25/25 Non-Golden & Statutory Unit Tests Passing (100%)**:
  - Core: Purity, topological sorting, 3-state cycle detection, missing base detection, half-up rounding edge cases, advance clamping, zero-day period safety, and plain-English explainers.
  - Statutory: Rule pack loader with strict date matching & non-silent errors, 50% wage code validator (detects breach, attaches warning, never mutates amounts), TDS stub returning 0 with `"TDS not configured"`, empty PT slabs handling.
- **11 Golden Tests with User-Verifiable Diff Output**:
  - 7 Core Edge Cases (Full month, mid-month joiner/leaver, LOP days, daily wage with OT, advance exceeding net pay, zero-day month, leap-year February).
  - 4 Statutory Edge Cases (PF wage ceiling cap, dual PF+ESI applicability on low wages, executive advance + capped PF, 50% Wage Code breach).

---

## 10. Development & Build Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Turbopack and live synchronization |
| `npm run build` | Standard production build (used by Vercel and CI environments) |
| `npm run build:local` | Windows FAT32 local mirror build script |
| `npm run test:rls` | Executes the complete database RLS and schema test suite (PGlite) |
| `npm run test:engine` | Executes the payroll calculation engine non-golden and golden test suites |
| `npm run lint` | Runs ESLint analysis across the project |
