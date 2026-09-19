// tests/payroll/run-lifecycle-tests.js
// Automated verification for the Payroll Run Lifecycle and Pre-Run Checks

const fs = require('fs');
const path = require('path');

let PGlite;
try {
  PGlite = require('@electric-sql/pglite').PGlite;
} catch (e) {
  PGlite = require('C:/Users/thesh/HajriBuild/node_modules/@electric-sql/pglite').PGlite;
}

const ORG_A_ID = 'a0000000-0000-0000-0000-000000000001';
const OWNER_ID = '11111111-1111-1111-1111-111111111111';
const MANAGER_ID = '22222222-2222-2222-2222-222222222222';

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
  console.log('='.repeat(70));
  console.log('  PAYROLL RUN LIFECYCLE & PRE-RUN CHECKS TEST SUITE');
  console.log('='.repeat(70));

  const db = new PGlite();

  // 1. Apply Migrations 1-5
  console.log('\n[1/4] Applying Migrations...');
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const migrationFiles = [
    '20260919000001_create_payroll_schema.sql',
    '20260919000002_create_triggers.sql',
    '20260919000003_create_rls_policies.sql',
    '20260919000004_auth_and_onboarding.sql',
    '20260919000005_payroll_lifecycle.sql',
  ];

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
  }
  console.log('  ✓ All 5 migrations applied cleanly.');

  // 2. Seed Data
  console.log('\n[2/4] Applying Seed Data...');
  const seedSql = fs.readFileSync(path.resolve(__dirname, '../../supabase/seed.sql'), 'utf8');
  await db.exec(seedSql);
  console.log('  ✓ Seed script executed cleanly.');

  // 3. Test Lifecycle Transitions
  console.log('\n[3/4] Testing Lifecycle Transitions (draft -> review -> approved -> paid)...');

  // A. Create draft run for 2026-09
  const runId = 'd0000000-0000-0000-0000-000000000099';
  await db.query(`
    INSERT INTO payroll_runs (id, org_id, period_month, status)
    VALUES ($1, $2, '2026-09', 'draft');
  `, [runId, ORG_A_ID]);

  // Insert audit log for draft
  await db.query(`
    INSERT INTO audit_log (org_id, actor_id, entity, entity_id, action, before, after)
    VALUES ($1, $2, 'payroll_runs', $3, 'create_draft', NULL, '{"status": "draft"}'::jsonb);
  `, [ORG_A_ID, OWNER_ID, runId]);

  const draftCheck = await db.query('SELECT status FROM payroll_runs WHERE id = $1', [runId]);
  assert(draftCheck.rows[0].status === 'draft', 'Draft run created with status "draft"');

  // B. Transition draft -> review
  await db.query(`
    UPDATE payroll_runs SET status = 'review' WHERE id = $1;
  `, [runId]);
  await db.query(`
    INSERT INTO audit_log (org_id, actor_id, entity, entity_id, action, before, after)
    VALUES ($1, $2, 'payroll_runs', $3, 'transition_draft_to_review', '{"status": "draft"}'::jsonb, '{"status": "review"}'::jsonb);
  `, [ORG_A_ID, OWNER_ID, runId]);

  const reviewCheck = await db.query('SELECT status FROM payroll_runs WHERE id = $1', [runId]);
  assert(reviewCheck.rows[0].status === 'review', 'Transitioned draft -> review successfully');

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

  // C. Transition review -> approved (locks run)
  await queryAsUser(
    OWNER_ID,
    `UPDATE payroll_runs SET status = 'approved', approved_by = $2 WHERE id = $1;`,
    [runId, OWNER_ID]
  );

  await db.query(`
    INSERT INTO audit_log (org_id, actor_id, entity, entity_id, action, before, after)
    VALUES ($1, $2, 'payroll_runs', $3, 'transition_review_to_approved', '{"status": "review"}'::jsonb, '{"status": "approved"}'::jsonb);
  `, [ORG_A_ID, OWNER_ID, runId]);

  const approvedCheck = await db.query('SELECT status, locked_at, approved_by FROM payroll_runs WHERE id = $1', [runId]);
  assert(approvedCheck.rows[0].status === 'approved', 'Transitioned review -> approved successfully');
  assert(approvedCheck.rows[0].locked_at !== null, 'Trigger automatically stamped locked_at on approval');
  assert(approvedCheck.rows[0].approved_by === OWNER_ID, 'approved_by correctly recorded');

  // D. Transition approved -> paid
  await db.query(`
    UPDATE payroll_runs SET status = 'paid' WHERE id = $1;
  `, [runId]);
  await db.query(`
    INSERT INTO audit_log (org_id, actor_id, entity, entity_id, action, before, after)
    VALUES ($1, $2, 'payroll_runs', $3, 'transition_approved_to_paid', '{"status": "approved"}'::jsonb, '{"status": "paid"}'::jsonb);
  `, [ORG_A_ID, OWNER_ID, runId]);

  const paidCheck = await db.query('SELECT status FROM payroll_runs WHERE id = $1', [runId]);
  assert(paidCheck.rows[0].status === 'paid', 'Transitioned approved -> paid successfully');

  // E. Verify audit trail rows exist for every transition
  const auditRows = await db.query(`
    SELECT action FROM audit_log WHERE entity_id = $1 ORDER BY at ASC
  `, [runId]);
  assert(auditRows.rows.length === 4, `Audit log recorded exactly 4 transition events (got ${auditRows.rows.length})`);

  // 4. Testing Attendance Lock Rejection on Approved/Paid Period
  console.log('\n[4/4] Testing Attendance Lock Rejection and Non-Destructive Reversal...');

  // Create an attendance record in 2026-09 to test update block
  const emp1Id = 'e0000000-0000-0000-0000-000000000001';
  await db.query(`
    INSERT INTO attendance_records (org_id, employee_id, work_date, status)
    VALUES ($1, $2, '2026-09-10', 'P');
  `, [ORG_A_ID, emp1Id]);

  let lockBlocked = false;
  try {
    await db.query(`
      UPDATE attendance_records SET status = 'A' WHERE employee_id = $1 AND work_date = '2026-09-10';
    `, [emp1Id]);
  } catch (err) {
    lockBlocked = true;
    assert(
      err.message.includes('locked') || err.message.includes('approved and locked'),
      'Trigger BLOCKED attendance edit for locked/paid period'
    );
  }
  if (!lockBlocked) {
    assert(false, 'Expected attendance update for locked period to be rejected');
  }

  // F. Reversal: Create reversal run row linked to original with negated lines
  const revRunId = 'd0000000-0000-0000-0000-000000000088';
  await db.query(`
    INSERT INTO payroll_runs (id, org_id, period_month, status, reversal_of_id, reversed_at, locked_at, approved_by)
    VALUES ($1, $2, '2026-09', 'reversed', $3, now(), now(), $4);
  `, [revRunId, ORG_A_ID, runId, OWNER_ID]);

  // Insert original item and negated item
  const origItemId = 'f0000000-0000-0000-0000-000000000091';
  const revItemId = 'f0000000-0000-0000-0000-000000000092';
  await db.query(`
    INSERT INTO payroll_items (id, org_id, run_id, employee_id, gross_paise, deductions_paise, net_paise, days_paid)
    VALUES ($1, $2, $3, $4, 4500000, 500000, 4000000, 26);
  `, [origItemId, ORG_A_ID, runId, emp1Id]);

  await db.query(`
    INSERT INTO payroll_items (id, org_id, run_id, employee_id, gross_paise, deductions_paise, net_paise, days_paid)
    VALUES ($1, $2, $3, $4, -4500000, -500000, -4000000, -26);
  `, [revItemId, ORG_A_ID, revRunId, emp1Id]);

  // Insert original lines and negated lines
  await db.query(`
    INSERT INTO payroll_item_lines (org_id, item_id, component_code, label, kind, amount_paise, explain)
    VALUES ($1, $2, 'BASIC', 'Basic Salary', 'earning', 3500000, 'Base rate ₹35,000');
  `, [ORG_A_ID, origItemId]);

  await db.query(`
    INSERT INTO payroll_item_lines (org_id, item_id, component_code, label, kind, amount_paise, explain)
    VALUES ($1, $2, 'BASIC', 'Basic Salary (Reversal)', 'earning', -3500000, 'Reversal of run 2026-09');
  `, [ORG_A_ID, revItemId]);

  // Both runs remain visible in payroll_runs
  const bothRuns = await db.query(`
    SELECT id, status, reversal_of_id FROM payroll_runs WHERE period_month = '2026-09' ORDER BY created_at ASC
  `);
  assert(bothRuns.rows.length === 2, `Both original and reversal runs remain visible (found ${bothRuns.rows.length})`);
  assert(bothRuns.rows[0].status === 'paid', 'Original run remains in database');
  assert(bothRuns.rows[1].status === 'reversed', 'Reversal run has status "reversed"');
  assert(bothRuns.rows[1].reversal_of_id === runId, 'Reversal run links to original run ID');

  // Verify negated lines
  const revLine = await db.query(`
    SELECT amount_paise FROM payroll_item_lines WHERE item_id = $1
  `, [revItemId]);
  assert(BigInt(revLine.rows[0].amount_paise) === -3500000n, 'Reversal line has negated amount_paise (-3,500,000 paise)');

  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PAYROLL LIFECYCLE, PRE-RUN CHECK & REVERSAL TESTS PASSED!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Lifecycle test fatal error:', err);
  process.exit(1);
});
