-- supabase/migrations/20260919000008_privacy_and_security.sql
-- Migration 8: Privacy & Security Hardening
-- 1. Table consents: employee_id, purpose, granted_at, withdrawn_at, notice_version
-- 2. Table erasure_requests: employee_id, status (pending, approved, rejected), requested_at, reviewed_by, reviewed_at
-- 3. Table data_retention_policies: data_type, retention_days, description
-- 4. Stored procedures: process_erasure_request, enforce_data_retention
-- 5. RLS policies and storage bucket hardening

-- 1. Create consents table
CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('biometric_selfie', 'location', 'whatsapp')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at TIMESTAMPTZ,
    notice_version TEXT NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consents_org_id ON consents(org_id);
CREATE INDEX IF NOT EXISTS idx_consents_employee_id ON consents(employee_id);
CREATE INDEX IF NOT EXISTS idx_consents_purpose ON consents(purpose);
CREATE INDEX IF NOT EXISTS idx_consents_active ON consents(employee_id, purpose) WHERE withdrawn_at IS NULL;

-- Trigger to auto-update updated_at on consents
CREATE OR REPLACE FUNCTION trg_set_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consents_updated_at ON consents;
CREATE TRIGGER trg_consents_updated_at
BEFORE UPDATE ON consents
FOR EACH ROW
EXECUTE FUNCTION trg_set_consents_updated_at();

-- 2. Create erasure_requests table
CREATE TABLE IF NOT EXISTS erasure_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erasure_requests_org_id ON erasure_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_employee_id ON erasure_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_status ON erasure_requests(status);

DROP TRIGGER IF EXISTS trg_erasure_requests_updated_at ON erasure_requests;
CREATE TRIGGER trg_erasure_requests_updated_at
BEFORE UPDATE ON erasure_requests
FOR EACH ROW
EXECUTE FUNCTION trg_set_consents_updated_at();

-- 3. Create data_retention_policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    retention_days INT NOT NULL CHECK (retention_days > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_retention_org_data_type UNIQUE (org_id, data_type)
);

-- Seed default global retention policies (org_id NULL means global default)
INSERT INTO data_retention_policies (data_type, retention_days, description)
VALUES 
    ('biometric_selfies', 90, 'Attendance verification selfie photos stored in private storage bucket'),
    ('location_history', 180, 'Geographic coordinates and IP access logs captured during punch operations'),
    ('audit_logs', 365, 'System modification and access audit logs for administrative tracking'),
    ('payroll_records', 2920, 'Statutory payroll registers and financial line items (8 years mandated by Indian Law)')
ON CONFLICT DO NOTHING;

-- 4. Stored Procedure: process_erasure_request
-- Allow privacy/retention photo clearing without violating attendance calculation lock
CREATE OR REPLACE FUNCTION trg_check_attendance_not_locked()
RETURNS TRIGGER AS $$
DECLARE
    v_month TEXT;
    v_is_locked BOOLEAN;
BEGIN
    -- Allow privacy/retention photo path nullification
    IF TG_OP = 'UPDATE' AND NEW.photo_path IS NULL AND OLD.photo_path IS NOT NULL THEN
        IF (OLD.work_date, OLD.status, OLD.in_at, OLD.out_at, OLD.worked_minutes, OLD.ot_minutes)
           IS NOT DISTINCT FROM
           (NEW.work_date, NEW.status, NEW.in_at, NEW.out_at, NEW.worked_minutes, NEW.ot_minutes) THEN
            RETURN NEW;
        END IF;
    END IF;

    v_month := to_char(OLD.work_date, 'YYYY-MM');

    SELECT EXISTS (
        SELECT 1 FROM payroll_runs
        WHERE org_id = OLD.org_id
          AND period_month = v_month
          AND status IN ('approved', 'paid')
    ) INTO v_is_locked;

    IF v_is_locked THEN
        RAISE EXCEPTION 'Attendance cannot be modified for %: payroll run has been approved and locked', v_month;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_lock_check ON attendance_records;
CREATE TRIGGER trg_attendance_lock_check
BEFORE UPDATE OR DELETE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION trg_check_attendance_not_locked();

-- Approving an erasure request:
-- - Permanently removes selfies from storage.objects
-- - Clears photo_path from attendance_records
-- - Anonymises non-statutory personal fields on employees (phone, designation, department, bank_account_masked)
-- - ST STRICTLY PRESERVES statutory payroll ledger rows (payroll_runs, payroll_items, payroll_item_lines) and code/name for tax audits.
CREATE OR REPLACE FUNCTION process_erasure_request(
    p_request_id UUID,
    p_reviewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_deleted_photos INT := 0;
BEGIN
    SELECT * INTO v_req FROM erasure_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Erasure request not found';
    END IF;

    IF v_req.status != 'pending' THEN
        RAISE EXCEPTION 'Erasure request is already processed with status: %', v_req.status;
    END IF;

    -- 1. Delete selfies from storage.objects
    DELETE FROM storage.objects
    WHERE bucket_id = 'attendance-selfies'
      AND name IN (
          SELECT photo_path FROM attendance_records
          WHERE employee_id = v_req.employee_id
            AND photo_path IS NOT NULL
      );
    GET DIAGNOSTICS v_deleted_photos = ROW_COUNT;

    -- 2. Clear photo_path and location details from attendance_records
    UPDATE attendance_records
    SET photo_path = NULL
    WHERE employee_id = v_req.employee_id
      AND photo_path IS NOT NULL;

    -- 3. Withdraw all active consents
    UPDATE consents
    SET withdrawn_at = now()
    WHERE employee_id = v_req.employee_id
      AND withdrawn_at IS NULL;

    -- 4. Anonymise non-statutory personal fields on employees record
    UPDATE employees
    SET 
        phone = '0000000000',
        bank_account_masked = 'XXXXXXXXXXXX',
        department = 'Anonymised',
        designation = 'Former Employee',
        selfie_consent_at = NULL,
        whatsapp_consent = false,
        whatsapp_consent_at = NULL,
        is_active = false
    WHERE id = v_req.employee_id;

    -- 5. Mark erasure request as approved
    UPDATE erasure_requests
    SET 
        status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = now(),
        details = jsonb_build_object(
            'photos_deleted', v_deleted_photos,
            'statutory_payroll_preserved', true,
            'completed_at', now()
        )
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'photos_deleted', v_deleted_photos,
        'payroll_preserved', true
    );
END;
$$;

-- 5. Stored Procedure: enforce_data_retention
-- Scheduled procedure cleaning data exceeding defined retention periods
CREATE OR REPLACE FUNCTION enforce_data_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_selfie_days INT := 90;
    v_selfie_cutoff TIMESTAMPTZ;
    v_deleted_selfies INT := 0;
BEGIN
    SELECT COALESCE(retention_days, 90) INTO v_selfie_days
    FROM data_retention_policies
    WHERE data_type = 'biometric_selfies'
    LIMIT 1;

    v_selfie_cutoff := now() - (v_selfie_days || ' days')::interval;

    -- Purge expired photos
    DELETE FROM storage.objects
    WHERE bucket_id = 'attendance-selfies'
      AND name IN (
          SELECT photo_path FROM attendance_records
          WHERE source = 'selfie'
            AND photo_path IS NOT NULL
            AND (created_at < v_selfie_cutoff OR (work_date < v_selfie_cutoff::date))
      );
    GET DIAGNOSTICS v_deleted_selfies = ROW_COUNT;

    UPDATE attendance_records
    SET photo_path = NULL
    WHERE source = 'selfie'
      AND photo_path IS NOT NULL
      AND (created_at < v_selfie_cutoff OR (work_date < v_selfie_cutoff::date));

    RETURN jsonb_build_object(
        'selfies_deleted', v_deleted_selfies,
        'selfie_cutoff', v_selfie_cutoff,
        'executed_at', now()
    );
END;
$$;

-- 6. Enable RLS on newly created tables
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

GRANT ALL ON consents TO authenticated, anon;
GRANT ALL ON erasure_requests TO authenticated, anon;
GRANT ALL ON data_retention_policies TO authenticated, anon;

-- RLS for consents
DROP POLICY IF EXISTS p_consents_select ON consents;
CREATE POLICY p_consents_select ON consents
    FOR SELECT TO authenticated
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_consents_insert ON consents;
CREATE POLICY p_consents_insert ON consents
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_consents_update ON consents;
CREATE POLICY p_consents_update ON consents
    FOR UPDATE TO authenticated
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    )
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

-- RLS for erasure_requests
DROP POLICY IF EXISTS p_erasure_requests_select ON erasure_requests;
CREATE POLICY p_erasure_requests_select ON erasure_requests
    FOR SELECT TO authenticated
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_erasure_requests_insert ON erasure_requests;
CREATE POLICY p_erasure_requests_insert ON erasure_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

DROP POLICY IF EXISTS p_erasure_requests_update ON erasure_requests;
CREATE POLICY p_erasure_requests_update ON erasure_requests
    FOR UPDATE TO authenticated
    USING (
        org_id IN (SELECT caller_org_ids())
        AND NOT caller_is_employee(org_id)
    )
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND NOT caller_is_employee(org_id)
    );

-- RLS for data_retention_policies
DROP POLICY IF EXISTS p_retention_policies_select ON data_retention_policies;
CREATE POLICY p_retention_policies_select ON data_retention_policies
    FOR SELECT TO authenticated
    USING (org_id IS NULL OR org_id IN (SELECT caller_org_ids()));

DROP POLICY IF EXISTS p_retention_policies_modify ON data_retention_policies;
CREATE POLICY p_retention_policies_modify ON data_retention_policies
    FOR ALL TO authenticated
    USING (
        org_id IS NOT NULL 
        AND org_id IN (SELECT caller_org_ids())
        AND EXISTS (
            SELECT 1 FROM org_members om
            WHERE om.user_id = auth.uid() AND om.org_id = data_retention_policies.org_id AND om.role = 'owner'
        )
    );

-- 7. Storage RLS Hardening for payslips bucket
-- Restrict payslips bucket upload to owner, manager, accountant
DROP POLICY IF EXISTS p_payslips_bucket_insert ON storage.objects;
CREATE POLICY p_payslips_bucket_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'payslips'
        AND EXISTS (
            SELECT 1 FROM org_members om
            WHERE om.user_id = auth.uid()
              AND om.role IN ('owner', 'manager', 'accountant')
        )
    );
