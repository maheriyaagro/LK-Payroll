-- Supabase Seed Script
-- 1 Organization, 12 Employees (mixed employment types), 2 months attendance,
-- salary structures, components, advances, payroll runs, items, and audit logs.
-- All money columns strictly in bigint paise (1 INR = 100 paise).

-- Clear any previous seed data (in reverse dependency order)
DELETE FROM audit_log;
DELETE FROM payroll_item_lines;
DELETE FROM payroll_items;
DELETE FROM payroll_runs;
DELETE FROM advances;
DELETE FROM attendance_records;
DELETE FROM salary_components;
DELETE FROM salary_structures;
DELETE FROM org_members;
DELETE FROM employees;
DELETE FROM organizations;

DO $$
DECLARE
    -- Organization
    v_org_id UUID := 'a0000000-0000-0000-0000-000000000001';

    -- User IDs (for auth/org_members)
    v_owner_user_id UUID := '11111111-1111-1111-1111-111111111111';
    v_manager_user_id UUID := '22222222-2222-2222-2222-222222222222';
    v_accountant_user_id UUID := '33333333-3333-3333-3333-333333333333';

    -- Employee IDs
    v_emp1_id UUID := 'e0000000-0000-0000-0000-000000000001';
    v_emp2_id UUID := 'e0000000-0000-0000-0000-000000000002';
    v_emp3_id UUID := 'e0000000-0000-0000-0000-000000000003';
    v_emp4_id UUID := 'e0000000-0000-0000-0000-000000000004';
    v_emp5_id UUID := 'e0000000-0000-0000-0000-000000000005';
    v_emp6_id UUID := 'e0000000-0000-0000-0000-000000000006';
    v_emp7_id UUID := 'e0000000-0000-0000-0000-000000000007';
    v_emp8_id UUID := 'e0000000-0000-0000-0000-000000000008';
    v_emp9_id UUID := 'e0000000-0000-0000-0000-000000000009';
    v_emp10_id UUID := 'e0000000-0000-0000-0000-000000000010';
    v_emp11_id UUID := 'e0000000-0000-0000-0000-000000000011';
    v_emp12_id UUID := 'e0000000-0000-0000-0000-000000000012';

    -- User IDs for employees
    v_emp1_user_id UUID := '44444444-4444-4444-4444-000000000001';
    v_emp2_user_id UUID := '44444444-4444-4444-4444-000000000002';

    -- Payroll Run IDs
    v_run_jul_id UUID := 'd0000000-0000-0000-0000-000000000001';
    v_run_aug_id UUID := 'd0000000-0000-0000-0000-000000000002';

    -- Loop variables
    rec RECORD;
    d DATE;
    v_status TEXT;
    v_worked_mins INT;
    v_ot_mins INT;
    v_struct_id UUID;
    v_item_id UUID;
BEGIN
    -- 1. Insert Organization
    INSERT INTO organizations (id, name, pan, tin, address, state_code, created_at)
    VALUES (
        v_org_id,
        'Apex Infra & Projects Pvt Ltd',
        'AAACA1234F',
        '27AAACA1234F1Z5',
        'Plot 42, MIDC Industrial Area, Andheri East, Mumbai',
        '27',
        '2026-01-01 09:00:00+05:30'
    );

    -- 2. Insert Management Org Members
    INSERT INTO org_members (org_id, user_id, role, created_at) VALUES
        (v_org_id, v_owner_user_id, 'owner', '2026-01-01 09:00:00+05:30'),
        (v_org_id, v_manager_user_id, 'manager', '2026-01-02 09:00:00+05:30'),
        (v_org_id, v_accountant_user_id, 'accountant', '2026-01-02 09:00:00+05:30');

    -- 3. Insert 12 Employees (Mixed Employment Types: 4 Monthly, 4 Daily, 2 Hourly, 2 Contract)
    INSERT INTO employees (id, org_id, code, name, phone, doj, dol, department, designation, employment_type, pf_uan, esi_ic, bank_account_masked, is_active) VALUES
        -- Monthly (4)
        (v_emp1_id, v_org_id, 'EMP001', 'Rajesh Sharma', '+919820123401', '2025-04-01', NULL, 'Engineering', 'Site Project Manager', 'monthly', '100904123401', '3104123401', 'XXXX-XXXX-4101', true),
        (v_emp2_id, v_org_id, 'EMP002', 'Sunita Patil', '+919820123402', '2025-05-15', NULL, 'Finance', 'Senior Accounts Officer', 'monthly', '100904123402', '3104123402', 'XXXX-XXXX-4102', true),
        (v_emp3_id, v_org_id, 'EMP003', 'Amit Verma', '+919820123403', '2025-06-01', NULL, 'Operations', 'Quality Assurance Lead', 'monthly', '100904123403', '3104123403', 'XXXX-XXXX-4103', true),
        (v_emp4_id, v_org_id, 'EMP004', 'Priya Kulkarni', '+919820123404', '2025-08-01', NULL, 'Safety', 'Site Safety Officer', 'monthly', '100904123404', '3104123404', 'XXXX-XXXX-4104', true),

        -- Daily (4)
        (v_emp5_id, v_org_id, 'EMP005', 'Manoj Kumar', '+919820123405', '2026-01-10', NULL, 'Civil Works', 'Master Mason', 'daily', NULL, '3104123405', 'XXXX-XXXX-4105', true),
        (v_emp6_id, v_org_id, 'EMP006', 'Dinesh Yadav', '+919820123406', '2026-01-12', NULL, 'Carpentry', 'Lead Shuttering Carpenter', 'daily', NULL, '3104123406', 'XXXX-XXXX-4106', true),
        (v_emp7_id, v_org_id, 'EMP007', 'Ganesh Shinde', '+919820123407', '2026-02-01', NULL, 'Electrical', 'Industrial Electrician', 'daily', NULL, '3104123407', 'XXXX-XXXX-4107', true),
        (v_emp8_id, v_org_id, 'EMP008', 'Santosh Gupta', '+919820123408', '2026-02-15', NULL, 'Fabrication', 'Structural Welder', 'daily', NULL, '3104123408', 'XXXX-XXXX-4108', true),

        -- Hourly (2)
        (v_emp9_id, v_org_id, 'EMP009', 'Ramesh Jadhav', '+919820123409', '2026-03-01', NULL, 'Heavy Machinery', 'Excavator Operator', 'hourly', NULL, NULL, 'XXXX-XXXX-4109', true),
        (v_emp10_id, v_org_id, 'EMP010', 'Vikas Sawant', '+919820123410', '2026-03-10', NULL, 'Heavy Machinery', 'Tower Crane Operator', 'hourly', NULL, NULL, 'XXXX-XXXX-4110', true),

        -- Contract (2)
        (v_emp11_id, v_org_id, 'EMP011', 'Dr. Arvind Joshi', '+919820123411', '2026-04-01', NULL, 'Consulting', 'Geotechnical Consultant', 'contract', NULL, NULL, 'XXXX-XXXX-4111', true),
        (v_emp12_id, v_org_id, 'EMP012', 'Kavita Menon', '+919820123412', '2026-04-15', NULL, 'Design', 'BIM Architecture Consultant', 'contract', NULL, NULL, 'XXXX-XXXX-4112', true);

    -- Map Employee 1 and Employee 2 as org_members with role 'employee'
    INSERT INTO org_members (org_id, user_id, role, employee_id, created_at) VALUES
        (v_org_id, v_emp1_user_id, 'employee', v_emp1_id, '2025-04-01 10:00:00+05:30'),
        (v_org_id, v_emp2_user_id, 'employee', v_emp2_id, '2025-05-15 10:00:00+05:30');

    -- 4. Salary Structures & Components (All amounts in bigint paise)
    FOR rec IN SELECT id, employment_type FROM employees WHERE org_id = v_org_id ORDER BY code LOOP
        v_struct_id := gen_random_uuid();
        INSERT INTO salary_structures (id, org_id, employee_id, effective_from, effective_to)
        VALUES (v_struct_id, v_org_id, rec.id, '2026-01-01', NULL);

        IF rec.employment_type = 'monthly' THEN
            -- Base: ₹45,000 = 4,500,000 paise
            INSERT INTO salary_components (org_id, structure_id, code, label, kind, calc_type, amount_paise, is_statutory) VALUES
                (v_org_id, v_struct_id, 'BASIC', 'Basic Salary', 'earning', 'fixed', 3500000, false),
                (v_org_id, v_struct_id, 'HRA', 'House Rent Allowance', 'earning', 'fixed', 1500000, false),
                (v_org_id, v_struct_id, 'SPECIAL', 'Special Allowance', 'earning', 'fixed', 500000, false),
                (v_org_id, v_struct_id, 'PF_EMP', 'Provident Fund (Employee)', 'deduction', 'fixed', 180000, true),
                (v_org_id, v_struct_id, 'ESI_EMP', 'ESI (Employee)', 'deduction', 'fixed', 41250, true);
        ELSIF rec.employment_type = 'daily' THEN
            -- Daily wage: ₹900/day = 90,000 paise
            INSERT INTO salary_components (org_id, structure_id, code, label, kind, calc_type, amount_paise, is_statutory) VALUES
                (v_org_id, v_struct_id, 'DAILY_WAGE', 'Daily Wage Base', 'earning', 'fixed', 90000, false),
                (v_org_id, v_struct_id, 'SITE_ALLOWANCE', 'Site Attendance Allowance', 'earning', 'fixed', 15000, false);
        ELSIF rec.employment_type = 'hourly' THEN
            -- Hourly rate: ₹250/hr = 25,000 paise
            INSERT INTO salary_components (org_id, structure_id, code, label, kind, calc_type, amount_paise, is_statutory) VALUES
                (v_org_id, v_struct_id, 'HOURLY_RATE', 'Hourly Equipment Operator Rate', 'earning', 'fixed', 25000, false),
                (v_org_id, v_struct_id, 'OT_RATE', 'Overtime Hourly Rate', 'earning', 'fixed', 35000, false);
        ELSE -- contract
            -- Monthly contract retainer: ₹75,000 = 7,500,000 paise
            INSERT INTO salary_components (org_id, structure_id, code, label, kind, calc_type, amount_paise, is_statutory) VALUES
                (v_org_id, v_struct_id, 'RETAINER', 'Professional Retainer Fee', 'earning', 'fixed', 7500000, false),
                (v_org_id, v_struct_id, 'TDS_194J', 'TDS Professional (10%)', 'deduction', 'fixed', 750000, true);
        END IF;
    END LOOP;

    -- 5. Advances (2 employees have active advances)
    -- Rajesh Sharma: ₹20,000 advance, ₹5,000 recovery per month, ₹10,000 balance
    INSERT INTO advances (org_id, employee_id, amount_paise, given_on, recovery_per_month_paise, balance_paise) VALUES
        (v_org_id, v_emp1_id, 2000000, '2026-06-15', 500000, 1000000),
        -- Manoj Kumar: ₹10,000 advance, ₹2,500 recovery per month, ₹5,000 balance
        (v_org_id, v_emp5_id, 1000000, '2026-07-01', 250000, 500000);

    -- 6. Two Full Months of Attendance (July 1, 2026 to August 31, 2026 = 62 days per employee)
    FOR rec IN SELECT id FROM employees WHERE org_id = v_org_id LOOP
        FOR d IN SELECT generate_series('2026-07-01'::date, '2026-08-31'::date, '1 day'::interval)::date LOOP
            -- Determine realistic attendance pattern:
            -- Sundays are weekly off 'W'
            IF EXTRACT(DOW FROM d) = 0 THEN
                v_status := 'W';
                v_worked_mins := 0;
                v_ot_mins := 0;
            -- 2nd & 4th Saturday off for monthly staff, or present for site staff
            ELSIF EXTRACT(DOW FROM d) = 6 AND EXTRACT(DAY FROM d) BETWEEN 8 AND 14 THEN
                v_status := 'H'; -- Half day
                v_worked_mins := 240;
                v_ot_mins := 0;
            -- Occasional leave on 15th of the month
            ELSIF EXTRACT(DAY FROM d) = 15 THEN
                v_status := 'L';
                v_worked_mins := 0;
                v_ot_mins := 0;
            -- Overtime on select Thursdays
            ELSIF EXTRACT(DOW FROM d) = 4 AND EXTRACT(DAY FROM d) > 20 THEN
                v_status := 'OT';
                v_worked_mins := 480;
                v_ot_mins := 120;
            -- General present
            ELSE
                v_status := 'P';
                v_worked_mins := 480;
                v_ot_mins := 0;
            END IF;

            INSERT INTO attendance_records (
                org_id, employee_id, work_date, status,
                in_at, out_at, worked_minutes, ot_minutes, source, marked_by
            ) VALUES (
                v_org_id,
                rec.id,
                d,
                v_status,
                CASE WHEN v_worked_mins > 0 THEN (d || ' 09:00:00+05:30')::timestamptz ELSE NULL END,
                CASE WHEN v_worked_mins > 0 THEN ((d || ' 09:00:00+05:30')::timestamptz + (v_worked_mins + v_ot_mins || ' minutes')::interval) ELSE NULL END,
                v_worked_mins,
                v_ot_mins,
                'biometric',
                v_manager_user_id
            );
        END LOOP;
    END LOOP;

    -- 7. Payroll Runs
    -- July 2026 (Approved & Locked)
    INSERT INTO payroll_runs (id, org_id, period_month, status, locked_at, approved_by, created_at)
    VALUES (
        v_run_jul_id,
        v_org_id,
        '2026-07',
        'approved',
        '2026-08-05 11:30:00+05:30',
        v_owner_user_id,
        '2026-08-01 10:00:00+05:30'
    );

    -- August 2026 (Draft)
    INSERT INTO payroll_runs (id, org_id, period_month, status, locked_at, approved_by, created_at)
    VALUES (
        v_run_aug_id,
        v_org_id,
        '2026-08',
        'draft',
        NULL,
        NULL,
        '2026-09-01 10:00:00+05:30'
    );

    -- 8. Payroll Items & Lines for July 2026 (Approved run)
    -- Employee 1 (Rajesh Sharma, Monthly)
    v_item_id := 'f0000000-0000-0000-0000-000000000001';
    INSERT INTO payroll_items (id, org_id, run_id, employee_id, gross_paise, deductions_paise, net_paise, days_paid, snapshot) VALUES
        (v_item_id, v_org_id, v_run_jul_id, v_emp1_id, 5500000, 721250, 4778750, 26, '{"designation":"Site Project Manager","type":"monthly"}'::jsonb);

    INSERT INTO payroll_item_lines (org_id, item_id, component_code, label, kind, amount_paise, explain) VALUES
        (v_org_id, v_item_id, 'BASIC', 'Basic Salary', 'earning', 3500000, '35,000 monthly rate for 26 payable days'),
        (v_org_id, v_item_id, 'HRA', 'House Rent Allowance', 'earning', 1500000, '40% of Basic'),
        (v_org_id, v_item_id, 'SPECIAL', 'Special Allowance', 'earning', 500000, 'Project milestone allowance'),
        (v_org_id, v_item_id, 'PF_EMP', 'Provident Fund (Employee)', 'deduction', 180000, 'Statutory 12% capped at ₹1,800'),
        (v_org_id, v_item_id, 'ESI_EMP', 'ESI (Employee)', 'deduction', 41250, '0.75% of gross wage'),
        (v_org_id, v_item_id, 'ADV_REC', 'Salary Advance Recovery', 'deduction', 500000, 'Monthly EMI recovery for June festival advance');

    -- Employee 2 (Sunita Patil, Monthly)
    v_item_id := 'f0000000-0000-0000-0000-000000000002';
    INSERT INTO payroll_items (id, org_id, run_id, employee_id, gross_paise, deductions_paise, net_paise, days_paid, snapshot) VALUES
        (v_item_id, v_org_id, v_run_jul_id, v_emp2_id, 5000000, 221250, 4778750, 26, '{"designation":"Senior Accounts Officer","type":"monthly"}'::jsonb);

    INSERT INTO payroll_item_lines (org_id, item_id, component_code, label, kind, amount_paise, explain) VALUES
        (v_org_id, v_item_id, 'BASIC', 'Basic Salary', 'earning', 3500000, 'Full month worked'),
        (v_org_id, v_item_id, 'HRA', 'House Rent Allowance', 'earning', 1500000, 'Standard allowance'),
        (v_org_id, v_item_id, 'PF_EMP', 'Provident Fund (Employee)', 'deduction', 180000, '12% of basic'),
        (v_org_id, v_item_id, 'ESI_EMP', 'ESI (Employee)', 'deduction', 41250, '0.75% of gross wage');

    -- Employee 5 (Manoj Kumar, Daily Wage)
    v_item_id := 'f0000000-0000-0000-0000-000000000005';
    INSERT INTO payroll_items (id, org_id, run_id, employee_id, gross_paise, deductions_paise, net_paise, days_paid, snapshot) VALUES
        (v_item_id, v_org_id, v_run_jul_id, v_emp5_id, 2730000, 250000, 2480000, 26, '{"designation":"Master Mason","type":"daily","rate_per_day":90000}'::jsonb);

    INSERT INTO payroll_item_lines (org_id, item_id, component_code, label, kind, amount_paise, explain) VALUES
        (v_org_id, v_item_id, 'DAILY_WAGE', 'Daily Wages (26 days)', 'earning', 2340000, '26 days present @ ₹900/day'),
        (v_org_id, v_item_id, 'SITE_ALLOWANCE', 'Site Attendance Allowance', 'earning', 390000, '26 days @ ₹150/day'),
        (v_org_id, v_item_id, 'ADV_REC', 'Advance Deduction', 'deduction', 250000, 'Monthly recovery installment');

    -- 9. Audit Log
    INSERT INTO audit_log (org_id, actor_id, entity, entity_id, action, before, after, at) VALUES
        (v_org_id, v_owner_user_id, 'organization', v_org_id, 'create', NULL, '{"name":"Apex Infra & Projects Pvt Ltd"}'::jsonb, '2026-01-01 09:00:00+05:30'),
        (v_org_id, v_manager_user_id, 'payroll_run', v_run_jul_id, 'approve', '{"status":"review"}'::jsonb, '{"status":"approved"}'::jsonb, '2026-08-05 11:30:00+05:30'),
        (v_org_id, v_accountant_user_id, 'advance', v_emp1_id, 'issue', NULL, '{"amount_paise":2000000,"recovery":500000}'::jsonb, '2026-06-15 14:00:00+05:30');

END $$;
