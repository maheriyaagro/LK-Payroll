-- supabase/migrations/20260919000007_whatsapp_payslip.sql
-- Migration 7: WhatsApp Cloud API Payslip Delivery Schema
-- 1. Table message_log: id, org_id, employee_id, payroll_item_id, template, status, provider_message_id, error, created_at, updated_at
-- 2. Alter employees: add whatsapp_consent (boolean default false), whatsapp_consent_at (timestamptz)
-- 3. RLS policies on message_log ensuring multi-tenant isolation and employee-specific data protection
-- 4. Storage bucket 'payslips' for PDF document delivery

-- 1. Alter employees table to add WhatsApp consent columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'whatsapp_consent'
    ) THEN
        ALTER TABLE employees ADD COLUMN whatsapp_consent BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'whatsapp_consent_at'
    ) THEN
        ALTER TABLE employees ADD COLUMN whatsapp_consent_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_whatsapp_consent ON employees(org_id, whatsapp_consent);

-- 2. Create message_log table
CREATE TABLE IF NOT EXISTS message_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
    template TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'read')),
    provider_message_id TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying, filtering by status, matching webhook message IDs, and rate limit checks
CREATE INDEX IF NOT EXISTS idx_message_log_org_id ON message_log(org_id);
CREATE INDEX IF NOT EXISTS idx_message_log_employee_id ON message_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_message_log_payroll_item_id ON message_log(payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_message_log_provider_msg_id ON message_log(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_message_log_status ON message_log(status);
CREATE INDEX IF NOT EXISTS idx_message_log_created_at ON message_log(org_id, created_at DESC);

-- Trigger to auto-update updated_at on message_log
CREATE OR REPLACE FUNCTION trg_set_message_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_message_log_updated_at ON message_log;
CREATE TRIGGER trg_message_log_updated_at
BEFORE UPDATE ON message_log
FOR EACH ROW
EXECUTE FUNCTION trg_set_message_log_updated_at();

-- 3. System settings: default WhatsApp template name
INSERT INTO system_settings (key, value, description)
VALUES ('whatsapp_template_name', '"payslip_utility"'::jsonb, 'Default WhatsApp Cloud API approved utility template name')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS on message_log
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

GRANT ALL ON message_log TO authenticated, anon;

-- SELECT:
-- 1. Owners, managers, and accountants can view all message logs for their org.
-- 2. Employees can view only their own message logs.
DROP POLICY IF EXISTS p_message_log_select ON message_log;
CREATE POLICY p_message_log_select ON message_log
    FOR SELECT TO authenticated
    USING (
        org_id IN (SELECT caller_org_ids())
        AND (
            NOT caller_is_employee(org_id)
            OR employee_id = caller_employee_id(org_id)
        )
    );

-- INSERT:
-- Only owners and managers (and service role) can insert message logs
DROP POLICY IF EXISTS p_message_log_insert ON message_log;
CREATE POLICY p_message_log_insert ON message_log
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND NOT caller_is_employee(org_id)
    );

-- UPDATE:
-- Only owners and managers (and service role) can update message logs
DROP POLICY IF EXISTS p_message_log_update ON message_log;
CREATE POLICY p_message_log_update ON message_log
    FOR UPDATE TO authenticated
    USING (
        org_id IN (SELECT caller_org_ids())
        AND NOT caller_is_employee(org_id)
    )
    WITH CHECK (
        org_id IN (SELECT caller_org_ids())
        AND NOT caller_is_employee(org_id)
    );

-- 5. Storage bucket setup for payslip PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payslips',
    'payslips',
    true,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    allowed_mime_types = ARRAY['application/pdf'];

-- Storage RLS policy for payslips bucket
DROP POLICY IF EXISTS p_payslips_bucket_select ON storage.objects;
CREATE POLICY p_payslips_bucket_select ON storage.objects
    FOR SELECT TO public, authenticated, anon
    USING (bucket_id = 'payslips');

DROP POLICY IF EXISTS p_payslips_bucket_insert ON storage.objects;
CREATE POLICY p_payslips_bucket_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payslips');
