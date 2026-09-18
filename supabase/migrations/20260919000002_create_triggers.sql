-- Migration 2: Triggers for locking approved payroll runs and immutable audit log

-- 1. Automatic lock timestamp on payroll_runs approval
CREATE OR REPLACE FUNCTION trg_payroll_runs_lock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'approved' OR NEW.status = 'paid') AND NEW.locked_at IS NULL THEN
        NEW.locked_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_runs_lock_timestamp ON payroll_runs;
CREATE TRIGGER trg_payroll_runs_lock_timestamp
BEFORE INSERT OR UPDATE OF status ON payroll_runs
FOR EACH ROW
EXECUTE FUNCTION trg_payroll_runs_lock_timestamp();

-- 2. payroll_items insert-only once parent run is approved
CREATE OR REPLACE FUNCTION trg_check_payroll_item_locked()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status
    FROM payroll_runs
    WHERE id = OLD.run_id;

    IF v_status = 'approved' OR v_status = 'paid' THEN
        RAISE EXCEPTION 'payroll_items cannot be updated or deleted once parent payroll run is %', v_status;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_items_lock_check ON payroll_items;
CREATE TRIGGER trg_payroll_items_lock_check
BEFORE UPDATE OR DELETE ON payroll_items
FOR EACH ROW
EXECUTE FUNCTION trg_check_payroll_item_locked();

-- 3. payroll_item_lines insert-only once parent run is approved
CREATE OR REPLACE FUNCTION trg_check_payroll_item_line_locked()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT pr.status INTO v_status
    FROM payroll_items pi
    JOIN payroll_runs pr ON pr.id = pi.run_id
    WHERE pi.id = OLD.item_id;

    IF v_status = 'approved' OR v_status = 'paid' THEN
        RAISE EXCEPTION 'payroll_item_lines cannot be updated or deleted once parent payroll run is %', v_status;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_item_lines_lock_check ON payroll_item_lines;
CREATE TRIGGER trg_payroll_item_lines_lock_check
BEFORE UPDATE OR DELETE ON payroll_item_lines
FOR EACH ROW
EXECUTE FUNCTION trg_check_payroll_item_line_locked();

-- 4. audit_log is append-only (cannot update or delete)
CREATE OR REPLACE FUNCTION trg_audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON audit_log;
CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION trg_audit_log_immutable();
