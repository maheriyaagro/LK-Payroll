-- Migration 4: Auth, Onboarding Atomic RPC, and Manager Approval Guard Trigger

-- 1. Atomic Onboarding RPC: Creates organization and org_members with role 'owner' in one transaction
CREATE OR REPLACE FUNCTION create_organization_with_owner(
    p_name TEXT,
    p_state_code TEXT,
    p_pan TEXT DEFAULT NULL,
    p_emp_name TEXT DEFAULT NULL,
    p_emp_phone TEXT DEFAULT NULL,
    p_emp_dept TEXT DEFAULT NULL,
    p_emp_designation TEXT DEFAULT NULL,
    p_emp_type TEXT DEFAULT 'monthly'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_emp_id UUID := NULL;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create organization';
    END IF;

    -- Validate business name
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Organization name is required';
    END IF;

    -- 1. Insert into organizations
    INSERT INTO organizations (name, state_code, pan)
    VALUES (trim(p_name), COALESCE(trim(p_state_code), '27'), NULLIF(trim(p_pan), ''))
    RETURNING id INTO v_org_id;

    -- 2. Optional: Insert first employee if name provided
    IF p_emp_name IS NOT NULL AND trim(p_emp_name) != '' THEN
        INSERT INTO employees (
            org_id,
            code,
            name,
            phone,
            doj,
            department,
            designation,
            employment_type,
            is_active
        ) VALUES (
            v_org_id,
            'EMP001',
            trim(p_emp_name),
            NULLIF(trim(p_emp_phone), ''),
            CURRENT_DATE,
            NULLIF(trim(p_emp_dept), ''),
            NULLIF(trim(p_emp_designation), ''),
            COALESCE(p_emp_type, 'monthly'),
            true
        )
        RETURNING id INTO v_emp_id;
    END IF;

    -- 3. Insert into org_members with role 'owner'
    INSERT INTO org_members (org_id, user_id, role, employee_id)
    VALUES (v_org_id, v_user_id, 'owner', v_emp_id);

    RETURN jsonb_build_object(
        'org_id', v_org_id,
        'role', 'owner',
        'employee_id', v_emp_id,
        'name', p_name
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO authenticated;


-- 2. Trigger to ensure a 'manager' (or anyone other than 'owner') CANNOT approve a payroll run
CREATE OR REPLACE FUNCTION trg_check_payroll_approval_role()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID;
BEGIN
    -- Only check when transitioning status to 'approved' or 'paid'
    IF (NEW.status = 'approved' OR NEW.status = 'paid') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        v_user_id := auth.uid();
        
        -- If no authenticated user context, block approval
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required to approve payroll run';
        END IF;

        -- Check the caller's role in this organization
        SELECT role INTO v_role
        FROM org_members
        WHERE org_id = NEW.org_id AND user_id = v_user_id;

        IF v_role IS NULL OR v_role != 'owner' THEN
            RAISE EXCEPTION 'A user with role "%" cannot approve a payroll run. Only role "owner" is authorized.', COALESCE(v_role, 'none');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payroll_approval_role_check ON payroll_runs;
CREATE TRIGGER trg_payroll_approval_role_check
BEFORE UPDATE OF status ON payroll_runs
FOR EACH ROW
EXECUTE FUNCTION trg_check_payroll_approval_role();
