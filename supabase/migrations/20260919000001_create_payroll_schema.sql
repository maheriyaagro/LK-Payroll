-- Migration 1: Base Payroll Schema
-- All money columns strictly use bigint paise (1 INR = 100 paise). No numeric or float anywhere.
-- Every table except organizations has org_id and an index on it.

-- 1. organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pan TEXT,
    tin TEXT,
    address TEXT,
    state_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. org_members
CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant', 'employee')),
    employee_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_members_org_user UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);

-- 3. employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    doj DATE NOT NULL,
    dol DATE,
    department TEXT,
    designation TEXT,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('monthly', 'daily', 'hourly', 'contract')),
    pf_uan TEXT,
    esi_ic TEXT,
    bank_account_masked TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_employees_org_code UNIQUE (org_id, code)
);
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);

-- Foreign key linking org_members.employee_id to employees.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_org_members_employee'
    ) THEN
        ALTER TABLE org_members
        ADD CONSTRAINT fk_org_members_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. salary_structures
CREATE TABLE IF NOT EXISTS salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salary_structures_org_id ON salary_structures(org_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_employee_id ON salary_structures(employee_id);

-- 5. salary_components
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('earning', 'deduction', 'employer_cost')),
    calc_type TEXT NOT NULL CHECK (calc_type IN ('fixed', 'percent_of', 'slab')),
    amount_paise BIGINT NOT NULL DEFAULT 0,
    percent_of_code TEXT,
    is_statutory BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salary_components_org_id ON salary_components(org_id);
CREATE INDEX IF NOT EXISTS idx_salary_components_structure_id ON salary_components(structure_id);

-- 6. attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('P', 'A', 'H', 'L', 'W', 'OT')),
    in_at TIMESTAMPTZ,
    out_at TIMESTAMPTZ,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    ot_minutes INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    marked_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_records_org_id ON attendance_records(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_emp_date ON attendance_records(employee_id, work_date);

-- 7. advances
CREATE TABLE IF NOT EXISTS advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL,
    given_on DATE NOT NULL,
    recovery_per_month_paise BIGINT NOT NULL,
    balance_paise BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advances_org_id ON advances(org_id);
CREATE INDEX IF NOT EXISTS idx_advances_employee_id ON advances(employee_id);

-- 8. payroll_runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_month TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'paid', 'reversed')) DEFAULT 'draft',
    locked_at TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org_id ON payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org_period ON payroll_runs(org_id, period_month);

-- 9. payroll_items
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    gross_paise BIGINT NOT NULL DEFAULT 0,
    deductions_paise BIGINT NOT NULL DEFAULT 0,
    net_paise BIGINT NOT NULL DEFAULT 0,
    days_paid INTEGER NOT NULL DEFAULT 0,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_items_org_id ON payroll_items(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run_id ON payroll_items(run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON payroll_items(employee_id);

-- 10. payroll_item_lines
CREATE TABLE IF NOT EXISTS payroll_item_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
    component_code TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('earning', 'deduction', 'employer_cost')),
    amount_paise BIGINT NOT NULL DEFAULT 0,
    explain TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_item_lines_org_id ON payroll_item_lines(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_lines_item_id ON payroll_item_lines(item_id);

-- 11. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    before JSONB,
    after JSONB,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity, entity_id);
