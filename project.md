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
├── src/
│   ├── app/
│   │   ├── (app)/
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
│   │   ├── globals.css            # Design tokens, color palette, responsive utilities
│   │   └── layout.tsx             # Root app layout with responsive shell
│   ├── components/
│   │   ├── home/                  # Dashboard components (HeroCard, StatCard, EmployeeList)
│   │   └── shell/                 # Navigation shell (SideNav for desktop, BottomNav for mobile, TopBar)
│   └── lib/
│       ├── mock.ts                # Realistic Indian mock data (names, roles, wages, attendance)
│       └── nav-config.ts          # Centralized navigation configuration
├── supabase/
│   ├── migrations/
│   │   ├── 20260919000001_create_payroll_schema.sql  # 11 tables, constraints, org_id indexes
│   │   ├── 20260919000002_create_triggers.sql        # Lock triggers & audit log immutability
│   │   └── 20260919000003_create_rls_policies.sql    # Tenant isolation & role RLS policies
│   └── seed.sql                   # 1 org, 12 mixed-type employees, 2 months attendance
├── tests/
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

### 1. Owner Home Dashboard (`/`)
- **Header**: Personalized greeting, business name, user avatar, and notifications indicator.
- **Hero Card**: Financial anchor card featuring current month payroll total (Indian formatting: `₹4,82,500`), delta badge (`+6.2%`), period chip, and direct primary action buttons:
  - *"Mark hajri"* (Primary accent button)
  - *"Run payroll"* (Surface button)
- **Live Metrics**: Grid of metric cards showing today's attendance summary (Present count) and total outstanding salary advances.
- **Workforce Attendance Roster**:
  - Filter chips: *Today*, *Late*, *Absent*, *On leave*.
  - Responsive presentation: Mobile tap-friendly cards on small screens, structured data table on desktop.

### 2. Daily Attendance / Hajri (`/attendance`)
- **7-Day Date Strip**: Horizontal swipeable date selector with today highlighted as an active solid accent pill.
- **Summary Counters**: Live count badges for *Present*, *Absent*, *Half-day*, and *Overtime hours*.
- **Bulk Action**: 1-tap *"Mark all present"* button to accelerate morning check-ins.
- **Worker Cards**: Individual employee cards with avatar, designation, and responsive segmented status control:
  - `P` (Present)
  - `H` (Half-day)
  - `A` (Absent)
  - `OT` (Overtime)
- **Live Floating Status Dock**: Displays real-time marked status (*"23 marked, 5 pending"*) with a *"Save"* button that updates instantly as statuses toggle.

### 3. Payroll Management (`/payroll` & `/payroll/[id]`)
- **Month Selector & Status Banner**: Period chips with status badge (*Draft*, *Review*, *Approved*) and approval action button.
- **Roster Pay Overview**: Right-aligned net wages in tabular figures with a *"why?"* explainer trigger below each amount.
- **Payslip Detail (`/payroll/[id]`)**:
  - Employee header with trade code and masked bank account.
  - Large net salary hero card.
  - Itemized Earnings & Deductions breakdown with running subtotals in accent color.
  - **Plain-Language Explainers**: Expandable breakdown providing plain-text calculation transparency (e.g., *"35,000 monthly rate for 26 payable days"*, *"Statutory 12% capped at ₹1,800"*, *"Monthly EMI recovery for June festival advance"*).
  - One-tap sharing: WhatsApp share button & PDF export button.

### 4. Add Employee (`/employees/new`)
- Mobile-optimized form with dynamic avatar initials generator.
- Employment type selector (Monthly salaried, Daily wage, Hourly operator, Contract consultant).
- Comprehensive fields for Department, Designation, Joining date, Mobile number, PF UAN, ESI Insurance Number, and Bank details.

### 5. Responsive Shell
- **Desktop (≥768px)**: Fixed left sidebar (`SideNav`) with brand identity, direct page links, user profile, and high-visibility *"Add Employee"* button.
- **Mobile (<768px)**: Floating capsule dock (`BottomNav`) centered above the screen edge with active pill animation, quick actions, and the `+ Add` button in the final dock slot.

---

## 5. Database Schema & Architecture

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
| `payroll_runs` | Monthly payroll batches | `id`, `org_id`, `period_month`, `status` (`draft`, `review`, `approved`, `paid`, `reversed`), `locked_at`, `approved_by` |
| `payroll_items` | Employee payslip summaries | `id`, `org_id`, `run_id`, `employee_id`, `gross_paise`, `deductions_paise`, `net_paise`, `days_paid`, `snapshot` |
| `payroll_item_lines` | Itemized line calculations | `id`, `org_id`, `item_id`, `component_code`, `label`, `kind`, `amount_paise`, `explain` |
| `audit_log` | Immutable audit trail | `id`, `org_id`, `actor_id`, `entity`, `entity_id`, `action`, `before`, `after`, `at` |

---

## 6. Security, RLS & Triggers

### 1. Row Level Security (RLS)
- **Tenant Isolation**: A user only has access to rows where `org_id` matches an organization they belong to in `org_members`. Cross-organization access returns **0 rows**.
- **Role 'employee' Isolation**: Users with the `'employee'` role can exclusively query rows associated with their own `employee_id`. They receive **0 rows** when querying colleagues' payroll items, attendance records, advances, or payslips.
- **Manager & Owner Access**: Roles `'owner'`, `'manager'`, and `'accountant'` have visibility across all workers in their organization.

### 2. Business Integrity Triggers
- **Approved Run Locking**: Once a `payroll_runs` record transitions to `'approved'` or `'paid'`, database triggers block any subsequent `UPDATE` or `DELETE` operations on associated `payroll_items` or `payroll_item_lines`.
- **Lock Timestamping**: Transition to `'approved'` automatically records `locked_at = now()`.
- **Append-Only Audit Log**: Database triggers and RLS policies prevent `UPDATE` and `DELETE` on `audit_log` by anyone, ensuring complete audit immutability.

---

## 7. Testing & Verification

The project includes an automated test suite ([`tests/rls/run-tests.js`](file:///g:/LK-Payroll/tests/rls/run-tests.js)) powered by PGlite (WASM PostgreSQL).

To run the test suite:
```bash
npm run test:rls
```

### Verified Test Cases (32/32 Passing)
1. **Migration Pipeline**: Applies schema, trigger, and RLS migrations cleanly.
2. **Seed Execution**: Seeds 1 organization, 12 mixed-type employees, and 744 attendance records (2 months) without errors.
3. **Cross-Tenant Isolation**: Proves that an authenticated user from Org A receives 0 rows when querying Org B across all 11 tables.
4. **Role Isolation**: Proves that an authenticated employee sees their own payroll record but receives 0 rows when attempting to query a colleague's payroll item, attendance, advance, or item lines.
5. **Manager Verification**: Proves managers can view all 12 employees and items.
6. **Trigger Enforcement**: Proves that modifying items of an approved run raises an error, and updating/deleting audit logs is blocked.

---

## 8. Development & Build Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Turbopack and live synchronization |
| `npm run build` | Standard production build (used by Vercel and CI environments) |
| `npm run build:local` | Windows FAT32 local mirror build script |
| `npm run test:rls` | Executes the complete database RLS and schema test suite |
| `npm run lint` | Runs ESLint analysis across the project |
