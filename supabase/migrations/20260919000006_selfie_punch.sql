-- supabase/migrations/20260919000006_selfie_punch.sql
-- TASK 12a: Selfie Punch attendance schema, private storage bucket, RLS, and retention.

-- 1. Alter employees to add selfie_consent_at timestamp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'selfie_consent_at'
    ) THEN
        ALTER TABLE employees ADD COLUMN selfie_consent_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Alter attendance_records to add photo_path
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance_records' AND column_name = 'photo_path'
    ) THEN
        ALTER TABLE attendance_records ADD COLUMN photo_path TEXT;
    END IF;
END $$;

-- 3. System settings table for configurable retention
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_settings (key, value, description)
VALUES ('selfie_retention_days', '90'::jsonb, 'Retention threshold in days for attendance selfie photos')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_system_settings_select ON system_settings;
CREATE POLICY p_system_settings_select ON system_settings
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS p_system_settings_modify ON system_settings;
CREATE POLICY p_system_settings_modify ON system_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM org_members
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- 4. Storage Bucket Setup: attendance-selfies (PRIVATE)
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    public BOOLEAN DEFAULT false,
    avif_autodetection BOOLEAN DEFAULT false,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_accessed_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB
);

-- Helper function storage.foldername if not exists
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN regexp_split_to_array(name, '/');
END;
$$;

-- Register the private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attendance-selfies',
    'attendance-selfies',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Permissions on storage schema and tables
GRANT USAGE ON SCHEMA storage TO authenticated, anon, public;
GRANT ALL ON storage.buckets TO authenticated, anon, public;
GRANT ALL ON storage.objects TO authenticated, anon, public;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Storage RLS Policies for attendance-selfies
-- Path format: org_id/employee_id/date/time.jpg
-- SELECT Policy:
-- - Owners and managers can view photos of all employees in their organization.
-- - Employees can view ONLY their own photo. Employees cannot read each other's photos.
DROP POLICY IF EXISTS p_selfies_select ON storage.objects;
CREATE POLICY p_selfies_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND (
            -- Case A: User is owner or manager in the organization
            EXISTS (
                SELECT 1 FROM org_members om
                WHERE om.user_id = auth.uid()
                  AND om.role IN ('owner', 'manager')
                  AND om.org_id::text = (storage.foldername(name))[1]
            )
            -- Case B: User is an employee reading their own photo only
            OR EXISTS (
                SELECT 1 FROM org_members om
                WHERE om.user_id = auth.uid()
                  AND om.org_id::text = (storage.foldername(name))[1]
                  AND om.employee_id IS NOT NULL
                  AND om.employee_id::text = (storage.foldername(name))[2]
            )
        )
    );

-- INSERT Policy:
-- Members of the organization can upload photos to their org's folder
DROP POLICY IF EXISTS p_selfies_insert ON storage.objects;
CREATE POLICY p_selfies_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND EXISTS (
            SELECT 1 FROM org_members om
            WHERE om.user_id = auth.uid()
              AND om.org_id::text = (storage.foldername(name))[1]
        )
    );

-- DELETE / UPDATE Policy:
-- Only owner and manager can delete or modify photos in their org
DROP POLICY IF EXISTS p_selfies_delete ON storage.objects;
CREATE POLICY p_selfies_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND EXISTS (
            SELECT 1 FROM org_members om
            WHERE om.user_id = auth.uid()
              AND om.role IN ('owner', 'manager')
              AND om.org_id::text = (storage.foldername(name))[1]
        )
    );

-- 6. Retention Cleanup Stored Procedure
-- Deletes photo records older than retention_days (default from system_settings or 90 days)
CREATE OR REPLACE FUNCTION cleanup_expired_selfies(p_retention_days INT DEFAULT NULL)
RETURNS TABLE (deleted_count INT, cutoff_date TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_days INT;
    v_cutoff TIMESTAMPTZ;
    v_count INT := 0;
BEGIN
    -- Determine retention days
    IF p_retention_days IS NOT NULL AND p_retention_days > 0 THEN
        v_days := p_retention_days;
    ELSE
        SELECT COALESCE((value)::int, 90) INTO v_days
        FROM system_settings
        WHERE key = 'selfie_retention_days';
        IF v_days IS NULL THEN
            v_days := 90;
        END IF;
    END IF;

    v_cutoff := now() - (v_days || ' days')::interval;

    -- 1. Delete from storage.objects matching attendance_records older than cutoff
    DELETE FROM storage.objects
    WHERE bucket_id = 'attendance-selfies'
      AND name IN (
          SELECT photo_path FROM attendance_records
          WHERE source = 'selfie'
            AND photo_path IS NOT NULL
            AND (created_at < v_cutoff OR (work_date < (v_cutoff::date)))
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- 2. Clear photo_path from attendance_records older than cutoff
    UPDATE attendance_records
    SET photo_path = NULL
    WHERE source = 'selfie'
      AND photo_path IS NOT NULL
      AND (created_at < v_cutoff OR (work_date < (v_cutoff::date)));

    RETURN QUERY SELECT v_count, v_cutoff;
END;
$$;
