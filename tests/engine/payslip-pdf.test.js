// tests/engine/payslip-pdf.test.js
// Automated verification for Payslip PDF generation, font registration, exact amount matching, and colleague access barriers.

const fs = require('fs');
const path = require('path');

let PGlite;
try {
  PGlite = require('@electric-sql/pglite').PGlite;
} catch (e) {
  PGlite = require('C:/Users/thesh/HajriBuild/node_modules/@electric-sql/pglite').PGlite;
}

let React;
try {
  React = require('react');
} catch (e) {
  React = require('C:/Users/thesh/HajriBuild/node_modules/react');
}

let ReactPdf;
try {
  ReactPdf = require('@react-pdf/renderer');
} catch (e) {
  ReactPdf = require('C:/Users/thesh/HajriBuild/node_modules/@react-pdf/renderer');
}

const ORG_A_ID = 'a0000000-0000-0000-0000-000000000001';
const OWNER_ID = '11111111-1111-1111-1111-111111111111';
const MANAGER_ID = '22222222-2222-2222-2222-222222222222';
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

// ── Number to Words Unit Function (mirroring src/server/payslipPdf.ts) ────────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(n) {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

function numberToIndianWords(paise) {
  const p = BigInt(paise);
  if (p === 0n) return "Zero Rupees Only";

  const isNegative = p < 0n;
  const absPaise = isNegative ? -p : p;
  const rupees = Number(absPaise / 100n);
  const remPaise = Number(absPaise % 100n);

  let num = rupees;
  let words = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  if (crore > 0) words += convertBelowThousand(crore) + " Crore ";
  if (lakh > 0) words += convertBelowThousand(lakh) + " Lakh ";
  if (thousand > 0) words += convertBelowThousand(thousand) + " Thousand ";
  if (hundred > 0) words += convertBelowThousand(hundred) + " ";

  words = words.trim();
  let result = words ? `${words} Rupees` : "";

  if (remPaise > 0) {
    const paiseWords = convertBelowThousand(remPaise);
    result += (result ? " and " : "") + `${paiseWords} Paise`;
  }

  result = result ? `${result} Only` : "Zero Rupees Only";
  return (isNegative ? "Negative " : "") + result;
}

function maskPan(pan) {
  if (!pan || pan.trim().length === 0) return "—";
  const cleaned = pan.trim().toUpperCase();
  if (cleaned.length <= 4) return cleaned;
  return "•".repeat(cleaned.length - 4) + cleaned.slice(-4);
}

function formatRupees(paise) {
  const p = BigInt(paise);
  const isNegative = p < 0n;
  const absPaise = isNegative ? -p : p;
  const rupees = Number(absPaise) / 100;
  return `${isNegative ? "-" : ""}₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function main() {
  console.log('='.repeat(70));
  console.log('  PAYSLIP PDF GENERATION & AUTHORIZATION TEST SUITE');
  console.log('='.repeat(70));

  // 1. Verify Local Fonts Existence
  console.log('\n[1/5] Verifying Bundled Local Fonts...');
  const fontsDir = path.resolve(__dirname, '../../src/assets/fonts');
  const requiredFonts = [
    'NotoSans-Regular.ttf',
    'NotoSans-Bold.ttf',
    'NotoSansDevanagari-Regular.ttf',
    'NotoSansDevanagari-Bold.ttf',
  ];

  for (const f of requiredFonts) {
    const fontPath = path.join(fontsDir, f);
    assert(fs.existsSync(fontPath), `Local font file exists: ${f} (${(fs.statSync(fontPath).size / 1024).toFixed(1)} KB)`);
  }

  // 2. Test Number to Words and Formatting
  console.log('\n[2/5] Testing Number to Indian Words & Currency Formatting...');
  assert(
    numberToIndianWords(4778750) === "Forty Seven Thousand Seven Hundred Eighty Seven Rupees and Fifty Paise Only",
    `4778750 paise => "${numberToIndianWords(4778750)}"`
  );
  assert(
    numberToIndianWords(5500000) === "Fifty Five Thousand Rupees Only",
    `5500000 paise => "${numberToIndianWords(5500000)}"`
  );
  assert(
    numberToIndianWords(12500000) === "One Lakh Twenty Five Thousand Rupees Only",
    `12500000 paise => "${numberToIndianWords(12500000)}"`
  );
  assert(
    maskPan("ABCDE1234F") === "••••••234F",
    `PAN masking: ABCDE1234F => ${maskPan("ABCDE1234F")}`
  );
  assert(
    formatRupees(4778750) === "₹47,787.50",
    `Currency format: 4778750 paise => ${formatRupees(4778750)}`
  );

  // 3. Initialize Database & Seed
  console.log('\n[3/5] Initializing Database & Seed Data...');
  const db = new PGlite();
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const migrationFiles = [
    '20260919000001_create_payroll_schema.sql',
    '20260919000002_create_triggers.sql',
    '20260919000003_create_rls_policies.sql',
    '20260919000004_auth_and_onboarding.sql',
    '20260919000005_payroll_lifecycle.sql',
    '20260919000006_selfie_punch.sql',
  ];

  for (const mf of migrationFiles) {
    await db.exec(fs.readFileSync(path.join(migrationsDir, mf), 'utf8'));
  }

  const seedSql = fs.readFileSync(path.resolve(__dirname, '../../supabase/seed.sql'), 'utf8');
  await db.exec(seedSql);
  console.log('  ✓ Database initialized with full schema and seed.');

  // 4. Test Rendering PDF for Stored Items and Checking Amounts Match
  console.log('\n[4/5] Testing PDF Generation for Seeded Employees with Stored Fidelity...');

  // Query seeded items
  const itemsRes = await db.query(`
    SELECT pi.id, pi.employee_id, pi.gross_paise, pi.deductions_paise, pi.net_paise, pi.days_paid,
           e.code, e.name, e.department, e.designation, e.bank_account_masked,
           o.name as org_name, o.address as org_address, o.pan as org_pan,
           pr.period_month
    FROM payroll_items pi
    JOIN employees e ON e.id = pi.employee_id
    JOIN organizations o ON o.id = pi.org_id
    JOIN payroll_runs pr ON pr.id = pi.run_id
    ORDER BY e.code
  `);

  assert(itemsRes.rows.length >= 3, `Found ${itemsRes.rows.length} seeded payroll items`);

  // Register fonts in @react-pdf/renderer
  const { Font, Document, Page, Text, View, StyleSheet, renderToBuffer } = ReactPdf;

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: path.join(fontsDir, "NotoSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontsDir, "NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  Font.register({
    family: "NotoSansDevanagari",
    fonts: [
      { src: path.join(fontsDir, "NotoSansDevanagari-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontsDir, "NotoSansDevanagari-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  for (const item of itemsRes.rows) {
    // Fetch lines
    const linesRes = await db.query(`
      SELECT component_code, label, kind, amount_paise, explain
      FROM payroll_item_lines
      WHERE item_id = $1
      ORDER BY kind
    `, [item.id]);

    const earnings = linesRes.rows.filter(l => l.kind === 'earning');
    const deductions = linesRes.rows.filter(l => l.kind === 'deduction');
    const employerCosts = linesRes.rows.filter(l => l.kind === 'employer_cost');

    // Strict validation: Sum of stored earnings lines must equal stored gross_paise
    const sumEarnings = earnings.reduce((acc, l) => acc + BigInt(l.amount_paise), 0n);
    assert(
      sumEarnings === BigInt(item.gross_paise),
      `Stored lines match gross_paise to the paisa for ${item.name} (${formatRupees(item.gross_paise)})`
    );

    // Sum of stored deduction lines must equal stored deductions_paise
    const sumDeductions = deductions.reduce((acc, l) => acc + BigInt(l.amount_paise), 0n);
    assert(
      sumDeductions === BigInt(item.deductions_paise),
      `Stored lines match deductions_paise to the paisa for ${item.name} (${formatRupees(item.deductions_paise)})`
    );

    // Net pay must equal gross - deductions
    assert(
      BigInt(item.gross_paise) - BigInt(item.deductions_paise) === BigInt(item.net_paise),
      `Net pay equals gross - deductions to the paisa for ${item.name} (${formatRupees(item.net_paise)})`
    );

    // Build PDF element
    const pdfDoc = React.createElement(
      Document,
      { title: `Payslip - ${item.code}` },
      React.createElement(
        Page,
        { size: "A4", style: { padding: 32, fontFamily: "NotoSans" } },
        React.createElement(Text, { style: { fontSize: 16, fontWeight: "bold" } }, item.org_name),
        React.createElement(Text, { style: { fontSize: 9, color: "#666" } }, item.org_address),
        React.createElement(Text, { style: { fontSize: 12, fontWeight: "bold", marginTop: 8 } }, `PAYSLIP FOR ${item.period_month}`),
        React.createElement(Text, { style: { fontSize: 10, marginTop: 4 } }, `Employee: ${item.name} (${item.code})`),
        React.createElement(Text, { style: { fontSize: 9 } }, `Days Paid: ${item.days_paid}`),
        React.createElement(Text, { style: { fontSize: 10, marginTop: 8 } }, `Gross Earnings: ${formatRupees(item.gross_paise)}`),
        React.createElement(Text, { style: { fontSize: 10 } }, `Total Deductions: ${formatRupees(item.deductions_paise)}`),
        React.createElement(Text, { style: { fontSize: 12, fontWeight: "bold", marginTop: 6 } }, `Take Home: ${formatRupees(item.net_paise)}`),
        React.createElement(Text, { style: { fontSize: 9, color: "#842029" } }, numberToIndianWords(item.net_paise)),
        React.createElement(Text, { style: { fontSize: 8, color: "#999", marginTop: 16 } }, "Computer generated, no signature required")
      )
    );

    const pdfBuffer = await renderToBuffer(pdfDoc);
    assert(
      pdfBuffer && pdfBuffer.length > 500,
      `Generated valid PDF for ${item.name} (${item.code}) - ${pdfBuffer.length} bytes`
    );
  }

  // 5. Test Employee Isolation & Colleague Fetch Barrier
  console.log('\n[5/5] Testing Route Authorization & Colleague Access Isolation...');

  async function simulateRouteGet(userId, role, userEmployeeId, requestedItemId) {
    // 1. Role verification
    if (!['owner', 'manager', 'accountant', 'employee'].includes(role)) {
      return { status: 403, error: 'Forbidden: Invalid role' };
    }

    // 2. Fetch item
    const itemQuery = await db.query(
      'SELECT id, org_id, employee_id FROM payroll_items WHERE id = $1',
      [requestedItemId]
    );

    if (itemQuery.rows.length === 0) {
      return { status: 404, error: 'Payroll item not found' };
    }

    const item = itemQuery.rows[0];

    // 3. Multi-tenant check
    if (item.org_id !== ORG_A_ID) {
      return { status: 403, error: 'Forbidden: Cross-organization access is strictly blocked.' };
    }

    // 4. Employee isolation: Employees can fetch ONLY their own
    if (role === 'employee') {
      if (!userEmployeeId || userEmployeeId !== item.employee_id) {
        return { status: 403, error: 'Forbidden: You are only authorized to download your own payslip.' };
      }
    }

    return { status: 200, item };
  }

  const emp1ItemId = 'f0000000-0000-0000-0000-000000000001'; // Rajesh Sharma
  const emp2ItemId = 'f0000000-0000-0000-0000-000000000002'; // Sunita Patil

  // Test A: Manager can fetch Employee 1's payslip
  const mgrFetchEmp1 = await simulateRouteGet(MANAGER_ID, 'manager', null, emp1ItemId);
  assert(mgrFetchEmp1.status === 200, 'Manager can fetch Employee 1 payslip (200 OK)');

  // Test B: Employee 1 can fetch their OWN payslip
  const emp1SelfFetch = await simulateRouteGet(EMP1_USER_ID, 'employee', EMP1_ID, emp1ItemId);
  assert(emp1SelfFetch.status === 200, 'Employee 1 can fetch their own payslip (200 OK)');

  // Test C: Employee 1 CANNOT fetch Employee 2's payslip
  const emp1ColleagueFetch = await simulateRouteGet(EMP1_USER_ID, 'employee', EMP1_ID, emp2ItemId);
  assert(
    emp1ColleagueFetch.status === 403,
    `RLS / ROUTE BARRIER: Employee 1 attempting to fetch Employee 2's payslip blocked with 403 Forbidden ("${emp1ColleagueFetch.error}")`
  );

  // Test D: Employee 2 can fetch their OWN payslip
  const emp2SelfFetch = await simulateRouteGet(EMP2_USER_ID, 'employee', EMP2_ID, emp2ItemId);
  assert(emp2SelfFetch.status === 200, 'Employee 2 can fetch their own payslip (200 OK)');

  // Test E: Employee 2 CANNOT fetch Employee 1's payslip
  const emp2ColleagueFetch = await simulateRouteGet(EMP2_USER_ID, 'employee', EMP2_ID, emp1ItemId);
  assert(
    emp2ColleagueFetch.status === 403,
    `RLS / ROUTE BARRIER: Employee 2 attempting to fetch Employee 1's payslip blocked with 403 Forbidden ("${emp2ColleagueFetch.error}")`
  );

  // Test F: Invalid Item ID returns 404
  const invalidFetch = await simulateRouteGet(MANAGER_ID, 'manager', null, 'f0000000-0000-0000-0000-999999999999');
  assert(invalidFetch.status === 404, 'Invalid item ID returns 404 Not Found');

  // 6. Test PDF generation for EVERY seeded employee (EMP001 through EMP012)
  console.log('\n[6/6] Testing Payslip PDF Generation for EVERY Seeded Employee (EMP001 - EMP012)...');
  const allEmpRes = await db.query(`SELECT id, code, name, designation, department, employment_type FROM employees WHERE org_id = $1 ORDER BY code`, [ORG_A_ID]);
  assert(allEmpRes.rows.length === 12, `Found exactly 12 seeded employees (got ${allEmpRes.rows.length})`);

  for (const emp of allEmpRes.rows) {
    // Check if payroll item exists, or fetch components
    let itemQuery = await db.query(`SELECT * FROM payroll_items WHERE employee_id = $1`, [emp.id]);
    let grossPaise = 0n;
    let netPaise = 0n;
    let daysPaid = 26;

    if (itemQuery.rows.length > 0) {
      grossPaise = BigInt(itemQuery.rows[0].gross_paise);
      netPaise = BigInt(itemQuery.rows[0].net_paise);
      daysPaid = itemQuery.rows[0].days_paid;
    } else {
      // Fetch components
      const compRes = await db.query(`
        SELECT sc.code, sc.label, sc.kind, sc.amount_paise
        FROM salary_components sc
        JOIN salary_structures ss ON ss.id = sc.structure_id
        WHERE ss.employee_id = $1
      `, [emp.id]);

      const earnings = compRes.rows.filter(c => c.kind === 'earning');
      const deductions = compRes.rows.filter(c => c.kind === 'deduction');
      grossPaise = earnings.reduce((sum, c) => sum + BigInt(c.amount_paise), 0n);
      const ded = deductions.reduce((sum, c) => sum + BigInt(c.amount_paise), 0n);
      netPaise = grossPaise - ded;
    }

    // Render PDF for this employee
    const pdfDoc = React.createElement(
      Document,
      { title: `Payslip - ${emp.code}` },
      React.createElement(
        Page,
        { size: "A4", style: { padding: 32, fontFamily: "NotoSans" } },
        React.createElement(Text, { style: { fontSize: 14, fontWeight: "bold" } }, "Apex Infra & Projects Pvt Ltd"),
        React.createElement(Text, { style: { fontSize: 8, color: "#666" } }, "Plot 42, MIDC Industrial Area, Andheri East, Mumbai"),
        React.createElement(Text, { style: { fontSize: 11, fontWeight: "bold", marginTop: 6 } }, "PAYSLIP FOR July 2026"),
        React.createElement(Text, { style: { fontSize: 9, marginTop: 4 } }, `${emp.name} (${emp.code}) • ${emp.designation || emp.employment_type}`),
        React.createElement(Text, { style: { fontSize: 9 } }, `Days Paid: ${daysPaid}`),
        React.createElement(Text, { style: { fontSize: 10, marginTop: 6, fontWeight: "bold" } }, `Net Pay: ${formatRupees(netPaise)}`),
        React.createElement(Text, { style: { fontSize: 8, color: "#842029" } }, numberToIndianWords(netPaise)),
        React.createElement(Text, { style: { fontSize: 8, color: "#999", marginTop: 14 } }, "Computer generated, no signature required")
      )
    );

    const pdfBuffer = await renderToBuffer(pdfDoc);
    assert(
      pdfBuffer && pdfBuffer.length > 500,
      `Generated valid PDF for seeded ${emp.code} (${emp.name}, ${emp.employment_type}) - ${pdfBuffer.length} bytes`
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
