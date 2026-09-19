-- Migration 5: Payroll Run Lifecycle & Attendance Lock Trigger
-- Adds reversal support to payroll_runs and locks attendance for approved/paid months.

-- 1. Add reversal_of_id and reversed_at to payroll_runs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_runs' AND column_name = 'reversal_of_id'
    ) THEN
        ALTER TABLE payroll_runs ADD COLUMN reversal_of_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_runs' AND column_name = 'reversed_at'
    ) THEN
        ALTER TABLE payroll_runs ADD COLUMN reversed_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_runs_reversal_of_id ON payroll_runs(reversal_of_id);

-- 2. Attendance Lock Trigger:
-- Edits (UPDATE or DELETE) to attendance_records are strictly rejected
-- if the payroll_runs record for that organization and month is 'approved' or 'paid'.
CREATE OR REPLACE FUNCTION trg_check_attendance_not_locked()
RETURNS TRIGGER AS $$
DECLARE
    v_month TEXT;
    v_is_locked BOOLEAN;
BEGIN
    -- Extract period month as 'YYYY-MM'
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
