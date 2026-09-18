// tests/rls/run-tests.js
// Automated test suite for Supabase Payroll Schema & Row Level Security (RLS)

const fs = require('fs');
const path = require('path');

// Resolve PGlite from local build mirror or workspace
let PGlite;
try {
  PGlite = require('@electric-sql/pglite').PGlite;
} catch (e) {
  try {
    PGlite = require('C:/Users/thesh/HajriBuild/node_modules/@electric-sql/pglite').PGlite;
  } catch (err) {
    console.error('Failed to load @electric-sql/pglite:', err.message);
    process.exit(1);
  }
}

// User & Org IDs matching seed.sql
const ORG_A_ID = 'a0000000-0000-0000-0000-000000000001';
const ORG_A_OWNER_ID = '11111111-1111-1111-1111-111111111111';
const ORG_A_MANAGER_ID = '22222222-2222-2222-2222-222222222222';
const ORG_A_ACCOUNTANT_ID = '33333333-3333-3333-3333-333333333333';
const ORG_A_EMP1_USER_ID = '44444444-4444-4444-4444-000000000001'; // Rajesh Sharma
const ORG_A_EMP2_USER_ID = '44444444-4444-4444-4444-000000000002'; // Sunita Patil

const ORG_A_EMP1_ID = 'e0000000-0000-0000-0000-000000000001';
const ORG_A_EMP2_ID = 'e0000000-0000-0000-0000-000000000002';

// Org B IDs for cross-tenant isolation testing
const ORG_B_ID = 'b0000000-0000-0000-0000-000000000002';
const ORG_B_OWNER_ID = '99999999-9999-9999-9999-999999999999';
const ORG_B_EMP_ID = 'e0000000-0000-0000-0000-000000000099';

const ALL_11_TABLES = [
  'organizations',
  'org_members',
  'employees',
  'salary_structures',
  'salary_components',
  'attendance_records',
  'advances',
  'payroll_runs',
  'payroll_items',
  'payroll_item_lines',
  'audit_log'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function run() {
  console.log('='.repeat(70));
  console.log('  SUPABASE PAYROLL SCHEMA & RLS TEST SUITE');
  console.log('='.repeat(70));

  const db = new PGlite();

  // 1. Apply Migrations
  console.log('\n[1/5] Applying Migrations...');
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const migrationFiles = [
    '20260919000001_create_payroll_schema.sql',
    '20260919000002_create_triggers.sql',
    '20260919000003_create_rls_policies.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await db.exec(sql);
      console.log(`  ✓ Applied migration: ${file}`);
    } catch (err) {
      console.error(`  ✗ Error applying ${file}:`, err);
      process.exit(1);
    }
  }

  // 2. Run Seed Script
  console.log('\n[2/5] Executing Seed Script (supabase/seed.sql)...');
  const seedPath = path.resolve(__dirname, '../../supabase/seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  try {
    await db.exec(seedSql);
    console.log('  ✓ Seed script executed cleanly with 0 errors.');
  } catch (err) {
    console.error('  ✗ Error executing seed.sql:', err);
    process.exit(1);
  }

  // Verify Seed Counts
  const empCount = await db.query('SELECT count(*) as cnt FROM employees WHERE org_id = $1', [ORG_A_ID]);
  assert(parseInt(empCount.rows[0].cnt) === 12, 'Seed created exactly 12 employees');

  const attCount = await db.query('SELECT count(*) as cnt FROM attendance_records WHERE org_id = $1', [ORG_A_ID]);
  assert(parseInt(attCount.rows[0].cnt) === 12 * 62, `Seed created 2 full months of attendance (744 records, got ${attCount.rows[0].cnt})`);

  const mixedTypes = await db.query('SELECT employment_type, count(*) as cnt FROM employees WHERE org_id = $1 GROUP BY employment_type', [ORG_A_ID]);
  const typesMap = Object.fromEntries(mixedTypes.rows.map(r => [r.employment_type, parseInt(r.cnt)]));
  assert(typesMap.monthly === 4, 'Seed includes 4 monthly employees');
  assert(typesMap.daily === 4, 'Seed includes 4 daily employees');
  assert(typesMap.hourly === 2, 'Seed includes 2 hourly employees');
  assert(typesMap.contract === 2, 'Seed includes 2 contract employees');

  // Verify money columns are bigint paise (no floating point / decimals)
  const compAmounts = await db.query('SELECT amount_paise FROM salary_components LIMIT 5');
  const allBigInt = compAmounts.rows.every(r => typeof r.amount_paise === 'bigint' || typeof r.amount_paise === 'number');
  assert(allBigInt, 'Salary component money amounts are pure integer paise (bigint)');

  // 3. Seed Org B for Cross-Tenant Testing
  console.log('\n[3/5] Setting up Org B for cross-tenant isolation testing...');
  await db.exec(`
    -- Create Org B
    INSERT INTO organizations (id, name, pan, state_code)
    VALUES ('${ORG_B_ID}', 'Beta Construction Pvt Ltd', 'BBBCB5678G', '27');

    INSERT INTO org_members (org_id, user_id, role)
    VALUES ('${ORG_B_ID}', '${ORG_B_OWNER_ID}', 'owner');

    INSERT INTO employees (id, org_id, code, name, doj, employment_type)
    VALUES ('${ORG_B_EMP_ID}', '${ORG_B_ID}', 'B-EMP001', 'Vijay Sharma', '2026-01-01', 'monthly');

    INSERT INTO salary_structures (id, org_id, employee_id, effective_from)
    VALUES ('c0000000-0000-0000-0000-000000000099', '${ORG_B_ID}', '${ORG_B_EMP_ID}', '2026-01-01');

    INSERT INTO salary_components (org_id, structure_id, code, label, kind, calc_type, amount_paise)
    VALUES ('${ORG_B_ID}', 'c0000000-0000-0000-0000-000000000099', 'BASIC', 'Basic', 'earning', 'fixed', 5000000);

    INSERT INTO attendance_records (org_id, employee_id, work_date, status)
    VALUES ('${ORG_B_ID}', '${ORG_B_EMP_ID}', '2026-08-01', 'P');

    INSERT INTO advances (org_id, employee_id, amount_paise, given_on, recovery_per_month_paise, balance_paise)
    VALUES ('${ORG_B_ID}', '${ORG_B_EMP_ID}', 1500000, '2026-07-01', 300000, 1200000);

    INSERT INTO payroll_runs (id, org_id, period_month, status)
    VALUES ('d0000000-0000-0000-0000-000000000099', '${ORG_B_ID}', '2026-08', 'draft');

    INSERT INTO payroll_items (id, org_id, run_id, employee_id, gross_paise, deductions_paise, net_paise)
    VALUES ('f0000000-0000-0000-0000-000000000099', '${ORG_B_ID}', 'd0000000-0000-0000-0000-000000000099', '${ORG_B_EMP_ID}', 5000000, 0, 5000000);

    INSERT INTO payroll_item_lines (org_id, item_id, component_code, label, kind, amount_paise)
    VALUES ('${ORG_B_ID}', 'f0000000-0000-0000-0000-000000000099', 'BASIC', 'Basic', 'earning', 5000000);

    INSERT INTO audit_log (org_id, actor_id, entity, action)
    VALUES ('${ORG_B_ID}', '${ORG_B_OWNER_ID}', 'organization', 'create');
  `);
  console.log('  ✓ Org B populated with complete dataset across all 11 tables.');

  // Helper to run query as a specific user (using Supabase standard 'authenticated' role)
  async function queryAsUser(userId, sql, params = []) {
    await db.exec(`
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '${userId}';
    `);
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec(`RESET ROLE;`);
    }
  }

  // 4. Cross-Tenant Isolation Tests (Org A user querying Org B data across all 11 tables)
  console.log('\n[4/5] Testing Cross-Tenant RLS: Org A user querying Org B rows...');
  for (const table of ALL_11_TABLES) {
    const filterCol = table === 'organizations' ? 'id' : 'org_id';
    const res = await queryAsUser(
      ORG_A_OWNER_ID,
      `SELECT count(*) as cnt FROM ${table} WHERE ${filterCol} = '${ORG_B_ID}'`
    );
    const count = parseInt(res.rows[0].cnt);
    assert(count === 0, `Table ${table}: Org A user received 0 rows from Org B (got ${count})`);
  }

  // Also verify user with role 'employee' in Org A gets 0 rows from Org B
  const empCrossOrgRes = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT count(*) as cnt FROM employees WHERE org_id = '${ORG_B_ID}'`
  );
  assert(parseInt(empCrossOrgRes.rows[0].cnt) === 0, "Org A 'employee' gets 0 rows from Org B employees");

  // 5. Role 'employee' Isolation Tests
  console.log("\n[5/5] Testing Role 'employee' Isolation: Employee 1 vs Colleague (Employee 2)...");

  // Test 5.1: Employee 1 can see their own payroll_items
  const emp1OwnItems = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT id, employee_id, net_paise FROM payroll_items WHERE org_id = '${ORG_A_ID}'`
  );
  assert(emp1OwnItems.rows.length === 1 && emp1OwnItems.rows[0].employee_id === ORG_A_EMP1_ID,
    `Employee 1 can view their own payroll_item (found ${emp1OwnItems.rows.length} row, employee_id = ${ORG_A_EMP1_ID})`);

  // Test 5.2: Employee 1 CANNOT see Employee 2's payroll_items
  const emp1QueryEmp2Item = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT id, employee_id FROM payroll_items WHERE employee_id = '${ORG_A_EMP2_ID}'`
  );
  assert(emp1QueryEmp2Item.rows.length === 0,
    `Employee 1 querying colleague's (Employee 2) payroll_item gets exactly 0 rows`);

  // Test 5.3: Employee 1 viewing employee table sees only themselves
  const emp1SeeEmployees = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT id, name FROM employees WHERE org_id = '${ORG_A_ID}'`
  );
  assert(emp1SeeEmployees.rows.length === 1 && emp1SeeEmployees.rows[0].id === ORG_A_EMP1_ID,
    `Employee 1 querying 'employees' sees only their own record (${emp1SeeEmployees.rows[0]?.name}), 0 colleagues`);

  // Test 5.4: Employee 1 viewing attendance records sees only their own
  const emp1SeeAttendance = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT count(*) as cnt FROM attendance_records WHERE employee_id != '${ORG_A_EMP1_ID}'`
  );
  assert(parseInt(emp1SeeAttendance.rows[0].cnt) === 0,
    `Employee 1 querying colleagues' attendance records gets 0 rows`);

  // Test 5.5: Employee 1 viewing advances sees only their own
  const emp1SeeAdvances = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT count(*) as cnt FROM advances WHERE employee_id != '${ORG_A_EMP1_ID}'`
  );
  assert(parseInt(emp1SeeAdvances.rows[0].cnt) === 0,
    `Employee 1 querying colleagues' advances gets 0 rows`);

  // Test 5.6: Employee 1 viewing payroll_item_lines sees only their own lines
  const emp1SeeLines = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT count(*) as cnt FROM payroll_item_lines WHERE item_id NOT IN (SELECT id FROM payroll_items WHERE employee_id = '${ORG_A_EMP1_ID}')`
  );
  assert(parseInt(emp1SeeLines.rows[0].cnt) === 0,
    `Employee 1 querying colleagues' payroll item lines gets 0 rows`);

  // Test 5.7: Employee 1 cannot view audit_log
  const emp1SeeAudit = await queryAsUser(
    ORG_A_EMP1_USER_ID,
    `SELECT count(*) as cnt FROM audit_log WHERE org_id = '${ORG_A_ID}'`
  );
  assert(parseInt(emp1SeeAudit.rows[0].cnt) === 0,
    `Employee 1 querying audit_log gets 0 rows (audit_log restricted to managers/owners)`);

  // Test 5.8: Manager CAN view all employees in Org A
  const mgrSeeEmployees = await queryAsUser(
    ORG_A_MANAGER_ID,
    `SELECT count(*) as cnt FROM employees WHERE org_id = '${ORG_A_ID}'`
  );
  assert(parseInt(mgrSeeEmployees.rows[0].cnt) === 12,
    `Manager querying employees sees all 12 employees in Org A`);

  // Test 5.9: Manager CAN view all payroll items in Org A
  const mgrSeeItems = await queryAsUser(
    ORG_A_MANAGER_ID,
    `SELECT count(*) as cnt FROM payroll_items WHERE org_id = '${ORG_A_ID}'`
  );
  assert(parseInt(mgrSeeItems.rows[0].cnt) === 3,
    `Manager querying payroll_items sees all 3 payroll items in Org A`);

  // 6. Trigger & Immutability Tests
  console.log('\n[Extra] Testing Triggers & Immutability Constraints...');

  // Reset to owner
  await db.exec(`SET request.jwt.claim.sub = '${ORG_A_OWNER_ID}';`);

  // Test 6.1: Cannot UPDATE payroll_items for an approved run
  let updateApprovedItemError = null;
  try {
    await db.exec(`
      UPDATE payroll_items
      SET net_paise = 999999
      WHERE run_id = 'd0000000-0000-0000-0000-000000000001';
    `);
  } catch (err) {
    updateApprovedItemError = err.message;
  }
  assert(
    updateApprovedItemError && updateApprovedItemError.includes('approved'),
    `Trigger blocked UPDATE on payroll_items for approved run: "${updateApprovedItemError?.trim()}"`
  );

  // Test 6.2: Cannot DELETE payroll_item_lines for an approved run
  let deleteApprovedLineError = null;
  try {
    await db.exec(`
      DELETE FROM payroll_item_lines
      WHERE item_id = 'f0000000-0000-0000-0000-000000000001';
    `);
  } catch (err) {
    deleteApprovedLineError = err.message;
  }
  assert(
    deleteApprovedLineError && deleteApprovedLineError.includes('approved'),
    `Trigger blocked DELETE on payroll_item_lines for approved run: "${deleteApprovedLineError?.trim()}"`
  );

  // Test 6.3: audit_log is append-only (cannot UPDATE)
  let updateAuditError = null;
  try {
    await db.exec(`
      UPDATE audit_log
      SET action = 'tampered'
      WHERE org_id = '${ORG_A_ID}';
    `);
  } catch (err) {
    updateAuditError = err.message;
  }
  assert(
    updateAuditError && updateAuditError.includes('append-only'),
    `Trigger blocked UPDATE on audit_log: "${updateAuditError?.trim()}"`
  );

  // Test 6.4: audit_log is append-only (cannot DELETE)
  let deleteAuditError = null;
  try {
    await db.exec(`
      DELETE FROM audit_log
      WHERE org_id = '${ORG_A_ID}';
    `);
  } catch (err) {
    deleteAuditError = err.message;
  }
  assert(
    deleteAuditError && deleteAuditError.includes('append-only'),
    `Trigger blocked DELETE on audit_log: "${deleteAuditError?.trim()}"`
  );

  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('='.repeat(70));

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL RLS, SCHEMA, TRIGGER, AND SEED TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
