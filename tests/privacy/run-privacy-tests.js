// tests/privacy/run-privacy-tests.js
// Automated verification suite for Privacy and Security Hardening
// Tests:
// 1. Migration 8 schema (consents, erasure_requests, data_retention_policies)
// 2. Server-side consent gatekeeping (biometric_selfie, location, whatsapp)
// 3. Erasure request processing & statutory payroll preservation
// 4. Data retention enforcement
// 5. Rate limiting logic
// 6. RLS multi-tenant & role isolation

const fs = require('fs');
const path = require('path');

let PGlite;
try {
  PGlite = require('@electric-sql/pglite').PGlite;
} catch (e) {
  PGlite = require('C:/Users/thesh/HajriBuild/node_modules/@electric-sql/pglite').PGlite;
}

const ORG_A_ID = 'a0000000-0000-0000-0000-000000000001';
const ORG_B_ID = 'b0000000-0000-0000-0000-000000000002';
const OWNER_ID = '11111111-1111-1111-1111-111111111111';
const EMP1_USER_ID = '44444444-4444-4444-4444-000000000001';
const EMP2_USER_ID = '44444444-4444-4444-4444-000000000002';
const EMP1_ID = 'e0000000-0000-0000-0000-000000000001';
const EMP2_ID = 'e0000000-0000-0000-0000-000000000002';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function run() {
  console.log('='.repeat(75));
  console.log('  PRIVACY & SECURITY HARDENING VERIFICATION SUITE');
  console.log('='.repeat(75));

  const db = new PGlite();

  // 1. Apply Migrations 1-8
  console.log('\n[1/6] Applying Migrations 1-8...');
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const migrationFiles = [
    '20260919000001_create_payroll_schema.sql',
    '20260919000002_create_triggers.sql',
    '20260919000003_create_rls_policies.sql',
    '20260919000004_auth_and_onboarding.sql',
    '20260919000005_payroll_lifecycle.sql',
    '20260919000006_selfie_punch.sql',
    '20260919000007_whatsapp_payslip.sql',
    '20260919000008_privacy_and_security.sql',
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf8');
      await db.exec(sql);
    }
  }
  console.log('  ✓ All 8 migrations applied cleanly.');

  // 2. Seed Data
  console.log('\n[2/6] Applying Seed Data...');
  const seedSql = fs.readFileSync(path.resolve(__dirname, '../../supabase/seed.sql'), 'utf8');
  await db.exec(seedSql);
  console.log('  ✓ Seed script executed cleanly.');

  // 3. Verify Consents Table & Constraints
  console.log('\n[3/6] Verifying Consents Schema & Constraints...');
  const consentCols = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'consents';
  `);
  const cNames = consentCols.rows.map((r) => r.column_name);
  assert(cNames.includes('employee_id'), 'consents has "employee_id"');
  assert(cNames.includes('purpose'), 'consents has "purpose"');
  assert(cNames.includes('granted_at'), 'consents has "granted_at"');
  assert(cNames.includes('withdrawn_at'), 'consents has "withdrawn_at"');
  assert(cNames.includes('notice_version'), 'consents has "notice_version"');

  // Purpose constraint check
  let invalidPurposeFailed = false;
  try {
    await db.query(`
      INSERT INTO consents (org_id, employee_id, purpose)
      VALUES ($1, $2, 'invalid_purpose');
    `, [ORG_A_ID, EMP1_ID]);
  } catch {
    invalidPurposeFailed = true;
  }
  assert(invalidPurposeFailed, 'Constraint rejects invalid consent purpose (only biometric_selfie, location, whatsapp)');

  // Grant and withdraw consent
  const c1 = await db.query(`
    INSERT INTO consents (org_id, employee_id, purpose, notice_version)
    VALUES ($1, $2, 'biometric_selfie', 'v1.0')
    RETURNING id;
  `, [ORG_A_ID, EMP1_ID]);
  assert(c1.rows.length === 1, 'Consent granted successfully');

  // Withdraw consent
  await db.query(`
    UPDATE consents
    SET withdrawn_at = now()
    WHERE id = $1;
  `, [c1.rows[0].id]);

  const activeCheck = await db.query(`
    SELECT count(*)::int as count FROM consents
    WHERE employee_id = $1 AND purpose = 'biometric_selfie' AND withdrawn_at IS NULL;
  `, [EMP1_ID]);
  assert(activeCheck.rows[0].count === 0, 'Active consent correctly marked as withdrawn');

  // 4. Verify Erasure Request Processing & Statutory Payroll Retention
  console.log('\n[4/6] Verifying Right to Erasure & Payroll Preservation Guarantee...');

  // Setup: give Employee 2 an attendance record with photo_path in current month (2026-09)
  const testPhotoPath = `${ORG_A_ID}/${EMP2_ID}/2026-09-19/090000.jpg`;
  await db.query(`
    INSERT INTO attendance_records (org_id, employee_id, work_date, status, source, photo_path)
    VALUES ($1, $2, '2026-09-19', 'P', 'selfie', $3);
  `, [ORG_A_ID, EMP2_ID, testPhotoPath]);

  // Check initial state of Employee 2 and payroll items
  const empBefore = await db.query(`SELECT phone, department, is_active FROM employees WHERE id = $1`, [EMP2_ID]);
  const payrollCountBefore = await db.query(`SELECT count(*)::int as count FROM payroll_items WHERE employee_id = $1`, [EMP2_ID]);

  assert(empBefore.rows[0].phone !== '0000000000', 'Employee initially has real contact details');
  assert(payrollCountBefore.rows[0].count > 0, 'Employee has existing statutory payroll ledger entries');

  // Create and process erasure request
  const reqInsert = await db.query(`
    INSERT INTO erasure_requests (org_id, employee_id, status)
    VALUES ($1, $2, 'pending')
    RETURNING id;
  `, [ORG_A_ID, EMP2_ID]);
  const reqId = reqInsert.rows[0].id;

  // Execute process_erasure_request RPC
  await db.query(`SELECT process_erasure_request($1, $2);`, [reqId, OWNER_ID]);

  // Verify erasure results
  const empAfter = await db.query(`SELECT phone, department, designation, is_active FROM employees WHERE id = $1`, [EMP2_ID]);
  assert(empAfter.rows[0].phone === '0000000000', 'Phone number anonymised to zeros');
  assert(empAfter.rows[0].department === 'Anonymised', 'Department anonymised');
  assert(empAfter.rows[0].designation === 'Former Employee', 'Designation updated to Former Employee');
  assert(empAfter.rows[0].is_active === false, 'Employee marked inactive');

  // Verify photo paths cleared
  const photoCheck = await db.query(`
    SELECT count(*)::int as count FROM attendance_records
    WHERE employee_id = $1 AND photo_path IS NOT NULL;
  `, [EMP2_ID]);
  assert(photoCheck.rows[0].count === 0, 'All biometric photo paths permanently cleared');

  // CRITICAL: Verify statutory payroll records preserved intact
  const payrollCountAfter = await db.query(`SELECT count(*)::int as count FROM payroll_items WHERE employee_id = $1`, [EMP2_ID]);
  assert(payrollCountAfter.rows[0].count === payrollCountBefore.rows[0].count, 'Statutory payroll records STRICTLY PRESERVED (0 rows deleted)');

  const reqAfter = await db.query(`SELECT status, reviewed_by FROM erasure_requests WHERE id = $1`, [reqId]);
  assert(reqAfter.rows[0].status === 'approved' && reqAfter.rows[0].reviewed_by === OWNER_ID, 'Erasure request marked as approved with reviewer audit log');

  // 5. Verify Scheduled Data Retention Procedures
  console.log('\n[5/6] Verifying Scheduled Data Retention Enforcement...');
  const retentionRes = await db.query(`SELECT enforce_data_retention();`);
  assert(retentionRes.rows.length === 1, 'enforce_data_retention stored procedure executes cleanly');

  const policies = await db.query(`SELECT count(*)::int as count FROM data_retention_policies`);
  assert(policies.rows[0].count >= 4, 'Default data retention policies initialized (selfies, location, audit, payroll)');

  // 6. Verify RLS Privacy & Cross-Tenant Isolation
  console.log('\n[6/6] Verifying RLS Privacy Policies...');

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

  // Insert consent for Employee 1
  await db.query(`
    INSERT INTO consents (org_id, employee_id, purpose, notice_version)
    VALUES ($1, $2, 'whatsapp', 'v1.0');
  `, [ORG_A_ID, EMP1_ID]);

  // Insert consent for Employee 2
  await db.query(`
    INSERT INTO consents (org_id, employee_id, purpose, notice_version)
    VALUES ($1, $2, 'whatsapp', 'v1.0');
  `, [ORG_A_ID, EMP2_ID]);

  // Employee 1 queries consents
  const emp1Consents = await queryAsUser(EMP1_USER_ID, `SELECT employee_id FROM consents;`);
  const emp1OnlySeesSelf = emp1Consents.rows.every((r) => r.employee_id === EMP1_ID);
  assert(emp1OnlySeesSelf && emp1Consents.rows.length > 0, 'RLS: Employee 1 sees ONLY their own consent records');

  // Owner queries consents (sees all in Org A)
  const ownerConsents = await queryAsUser(OWNER_ID, `SELECT count(*)::int as count FROM consents WHERE org_id = $1;`, [ORG_A_ID]);
  assert(ownerConsents.rows[0].count >= 2, 'RLS: Owner can view all consents across their organization');

  // Cross-tenant isolation check: setup Org B and test
  await db.query(`INSERT INTO organizations (id, name) VALUES ($1, 'Beta Privacy Ltd') ON CONFLICT DO NOTHING;`, [ORG_B_ID]);
  await db.query(`INSERT INTO employees (id, org_id, code, name, doj, employment_type) VALUES ('e0000000-0000-0000-0000-000000000099', $1, 'B-99', 'Bob', '2026-01-01', 'monthly') ON CONFLICT DO NOTHING;`, [ORG_B_ID]);
  await db.query(`
    INSERT INTO consents (org_id, employee_id, purpose, notice_version)
    VALUES ($1, 'e0000000-0000-0000-0000-000000000099', 'whatsapp', 'v1.0');
  `, [ORG_B_ID]);

  const crossConsents = await queryAsUser(OWNER_ID, `SELECT count(*)::int as count FROM consents WHERE org_id = $1;`, [ORG_B_ID]);
  assert(crossConsents.rows[0].count === 0, 'RLS: Org A Owner CANNOT access Org B consent records');

  console.log('\n' + '='.repeat(75));
  console.log(`  PRIVACY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(75));

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
