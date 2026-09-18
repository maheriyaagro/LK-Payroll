-- Migration 3: Row Level Security (RLS) Policies
-- Enforces:
-- 1. Row is visible only if org_id is in caller's org_members
-- 2. Employees with role 'employee' see only their own employee_id rows
-- 3. audit_log is append-only: no update or delete policy for anyone

-- Ensure auth schema and auth.uid() function exist for standard Supabase compatibility
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
        NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
$$;

-- Global helper to obtain caller user UUID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT auth.uid();
$$;

-- Helper to return all organization IDs the caller belongs to
CREATE OR REPLACE FUNCTION caller_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT org_id
    FROM org_members
    WHERE user_id = current_user_id();
$$;

-- Helper to determine if caller has 'employee' role in a specific org
CREATE OR REPLACE FUNCTION caller_is_employee(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM org_members
        WHERE org_id = p_org_id
          AND user_id = current_user_id()
          AND role = 'employee'
    );
$$;

-- Helper to get caller's mapped employee_id in a specific org
CREATE OR REPLACE FUNCTION caller_employee_id(p_org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT employee_id
    FROM org_members
    WHERE org_id = p_org_id
      AND user_id = current_user_id()
    LIMIT 1;
$$;

-- Ensure standard Supabase roles exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO authenticated, anon;

--------------------------------------------------------------------------------
-- 1. organizations
--------------------------------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_organizations_select ON organizations;
CREATE POLICY p_organizations_select ON organizations
    FOR SELECT
    USING (id IN (SELECT caller_org_ids()));

DROP POLICY IF EXISTS p_organizations_insert ON organizations;
CREATE POLICY p_organizations_insert ON organizations
    FOR INSERT
    WITH CHECK (id IN (SELECT caller_org_ids()));

DROP POLICY IF EXISTS p_organizations_update ON organizations;
CREATE POLICY p_organizations_update ON organizations
    FOR UPDATE
    USING (id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(id));

DROP POLICY IF EXISTS p_organizations_delete ON organizations;
CREATE POLICY p_organizations_delete ON organizations
    FOR DELETE
    USING (id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(id));

--------------------------------------------------------------------------------
-- 2. org_members
--------------------------------------------------------------------------------
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_org_members_select ON org_members;
CREATE POLICY p_org_members_select ON org_members
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR user_id = current_user_id()
        )
    );

DROP POLICY IF EXISTS p_org_members_all ON org_members;
CREATE POLICY p_org_members_all ON org_members
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 3. employees
--------------------------------------------------------------------------------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_employees_select ON employees;
CREATE POLICY p_employees_select ON employees
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_employees_all ON employees;
CREATE POLICY p_employees_all ON employees
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 4. salary_structures
--------------------------------------------------------------------------------
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_salary_structures_select ON salary_structures;
CREATE POLICY p_salary_structures_select ON salary_structures
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_salary_structures_all ON salary_structures;
CREATE POLICY p_salary_structures_all ON salary_structures
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 5. salary_components
--------------------------------------------------------------------------------
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_salary_components_select ON salary_components;
CREATE POLICY p_salary_components_select ON salary_components
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR structure_id IN (
                SELECT ss.id
                FROM salary_structures ss
                WHERE ss.employee_id = caller_employee_id(salary_components.org_id)
            )
        )
    );

DROP POLICY IF EXISTS p_salary_components_all ON salary_components;
CREATE POLICY p_salary_components_all ON salary_components
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 6. attendance_records
--------------------------------------------------------------------------------
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_attendance_records_select ON attendance_records;
CREATE POLICY p_attendance_records_select ON attendance_records
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_attendance_records_insert ON attendance_records;
CREATE POLICY p_attendance_records_insert ON attendance_records
    FOR INSERT
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_attendance_records_update ON attendance_records;
CREATE POLICY p_attendance_records_update ON attendance_records
    FOR UPDATE
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

DROP POLICY IF EXISTS p_attendance_records_delete ON attendance_records;
CREATE POLICY p_attendance_records_delete ON attendance_records
    FOR DELETE
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 7. advances
--------------------------------------------------------------------------------
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_advances_select ON advances;
CREATE POLICY p_advances_select ON advances
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_advances_all ON advances;
CREATE POLICY p_advances_all ON advances
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 8. payroll_runs
--------------------------------------------------------------------------------
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_payroll_runs_select ON payroll_runs;
CREATE POLICY p_payroll_runs_select ON payroll_runs
    FOR SELECT
    USING (org_id IN (SELECT caller_org_ids()));

DROP POLICY IF EXISTS p_payroll_runs_all ON payroll_runs;
CREATE POLICY p_payroll_runs_all ON payroll_runs
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 9. payroll_items
--------------------------------------------------------------------------------
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_payroll_items_select ON payroll_items;
CREATE POLICY p_payroll_items_select ON payroll_items
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_payroll_items_all ON payroll_items;
CREATE POLICY p_payroll_items_all ON payroll_items
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 10. payroll_item_lines
--------------------------------------------------------------------------------
ALTER TABLE payroll_item_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_payroll_item_lines_select ON payroll_item_lines;
CREATE POLICY p_payroll_item_lines_select ON payroll_item_lines
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR item_id IN (
                SELECT pi.id
                FROM payroll_items pi
                WHERE pi.employee_id = caller_employee_id(payroll_item_lines.org_id)
            )
        )
    );

DROP POLICY IF EXISTS p_payroll_item_lines_all ON payroll_item_lines;
CREATE POLICY p_payroll_item_lines_all ON payroll_item_lines
    FOR ALL
    USING (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id))
    WITH CHECK (org_id IN (SELECT caller_org_ids()) AND NOT caller_is_employee(org_id));

--------------------------------------------------------------------------------
-- 11. audit_log (append-only: SELECT & INSERT only, NO UPDATE OR DELETE)
--------------------------------------------------------------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_audit_log_select ON audit_log;
CREATE POLICY p_audit_log_select ON audit_log
    FOR SELECT
    USING (
        org_id IN (SELECT caller_org_ids())
        AND NOT caller_is_employee(org_id)
    );

DROP POLICY IF EXISTS p_audit_log_insert ON audit_log;
CREATE POLICY p_audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (org_id IN (SELECT caller_org_ids()));

-- NOTE: No UPDATE or DELETE policy exists for audit_log.
