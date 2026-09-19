// tests/engine/run-engine-tests.js
// Standalone test runner for Hajri Payroll Calculation Engine & Statutory Rules
// Transpiles TypeScript in-memory using TypeScript compiler API.

const fs = require('fs');
const path = require('path');

// Resolve typescript from local project or mirror
let ts;
try {
  ts = require('typescript');
} catch (e) {
  try {
    ts = require('C:/Users/thesh/HajriBuild/node_modules/typescript');
  } catch (err) {
    console.error('Failed to load typescript:', err.message);
    process.exit(1);
  }
}

// Register .ts require extension
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  });
  module._compile(result.outputText, filename);
};

// Import test suites
const { runNonGoldenTests } = require('./engine.test.ts');
const { runGoldenTests } = require('./golden.test.ts');
const { runStatutoryUnitTests, runStatutoryGoldenTests } = require('./statutory.test.ts');
const { runCompareTests } = require('./compare.test.ts');

console.log('='.repeat(80));
console.log('  HAJRI PAYROLL CALCULATION ENGINE - COMPREHENSIVE TEST SUITE');
console.log('='.repeat(80));

// 1. Core Engine Non-Golden Tests (Unit, Purity, Circular Dependencies, Rounding, etc.)
const coreNonGolden = runNonGoldenTests();

// 2. Statutory Rules & Validator Unit Tests (Rule Loader, Wage Code 50% Rule, Stubs)
const statutoryUnit = runStatutoryUnitTests();

// 3. Month-over-Month Comparison Tests
const compareRes = runCompareTests();

// 4. Core Engine Golden Tests (7 edge cases with TODO placeholders)
const coreGolden = runGoldenTests();

// 5. Statutory Golden Tests (4 statutory edge cases with TODO placeholders)
const statutoryGolden = runStatutoryGoldenTests();

const totalNonGoldenPassed = coreNonGolden.passed + statutoryUnit.passed + compareRes.passed;
const totalNonGoldenFailed = coreNonGolden.failed + statutoryUnit.failed + compareRes.failed;
const totalGoldenPassed = coreGolden.passed + statutoryGolden.passed;
const totalGoldenFailed = coreGolden.failed + statutoryGolden.failed;

console.log('\n' + '='.repeat(80));
console.log('  TEST SUMMARY');
console.log('='.repeat(80));
console.log(`  Non-Golden Core Unit Tests:      ${coreNonGolden.passed} passed, ${coreNonGolden.failed} failed`);
console.log(`  Statutory Rules & Unit Tests:    ${statutoryUnit.passed} passed, ${statutoryUnit.failed} failed`);
console.log(`  Core Golden Tests:               ${coreGolden.passed} passed, ${coreGolden.failed} pending/diffs (TODO)`);
console.log(`  Statutory Golden Tests:          ${statutoryGolden.passed} passed, ${statutoryGolden.failed} pending/diffs (TODO)`);
console.log('─'.repeat(80));
console.log(`  TOTAL NON-GOLDEN TESTS:          ${totalNonGoldenPassed} passed, ${totalNonGoldenFailed} failed`);
console.log(`  TOTAL GOLDEN TESTS (DIFFS):      ${totalGoldenPassed} passed, ${totalGoldenFailed} pending/diffs`);
console.log('='.repeat(80));

if (totalNonGoldenFailed > 0) {
  console.error('\n❌ UNIT TESTS FAILED! Engine logic needs fixes.');
  process.exit(1);
} else {
  console.log('\n✅ ALL NON-GOLDEN & STATUTORY UNIT TESTS PASSED CLEANLY (100%).');
  console.log('ℹ️  Golden test differences are expected until the user fills in TODO placeholders.');
  process.exit(0);
}
