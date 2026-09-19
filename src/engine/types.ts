// src/engine/types.ts
// Pure TypeScript types for the Hajri Payroll Calculation Engine
// All monetary values are strictly represented as bigint paise (1 INR = 100 paise).
// No floating point types (number/float) are permitted for currency amounts.

export type EmploymentType = 'monthly' | 'daily' | 'hourly' | 'contract';

export type AttendanceStatus =
  | 'P'   // Present
  | 'A'   // Absent (Unpaid)
  | 'H'   // Half-day (0.5 Payable)
  | 'L'   // Leave (Paid or LOP depending on policy)
  | 'W'   // Weekly Off (Paid for monthly within active service)
  | 'OT'; // Overtime shift

export type ComponentKind = 'earning' | 'deduction' | 'employer_cost';

export type ComponentCalcType = 'fixed' | 'percent_of' | 'slab';

export interface Period {
  year: number;
  month: number;          // 1-12
  daysInMonth: number;    // e.g. 30, 31, 28, 29, or 0 for edge-case tests
  startDate: string;      // ISO 'YYYY-MM-DD'
  endDate: string;        // ISO 'YYYY-MM-DD'
}

export interface AttendanceRow {
  workDate: string;       // ISO 'YYYY-MM-DD'
  status: AttendanceStatus;
  workedMinutes?: number; // Minutes worked in shift
  otMinutes?: number;     // Overtime minutes worked
  isLop?: boolean;        // Loss of pay flag for leaves
}

export interface AttendanceSummary {
  totalDaysInPeriod: number;
  // Represented as fractional paise/units (e.g. 26.5 days = 2650 centi-days or 26 days + 1 half)
  // For integer math, we use centi-days: 1 full day = 100 centi-days, half day = 50 centi-days.
  payableCentiDays: bigint;  // 26 days = 2600n, 26.5 days = 2650n
  lopCentiDays: bigint;      // 3 days = 300n
  workedMinutes: bigint;     // Total worked minutes across period
  otMinutes: bigint;         // Total overtime minutes
  weeklyOffCount: number;
  holidayCount: number;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  explain: string;
}

export interface SalaryComponentInput {
  code: string;
  label: string;
  kind: ComponentKind;
  calcType: ComponentCalcType;
  amountPaise: bigint;             // For fixed: monthly/daily/hourly base rate in paise; for percent_of: basis points (e.g. 1200n = 12.00%)
  percentOfCode?: string;          // Target component code if calcType === 'percent_of'
  isStatutory?: boolean;
}

export interface AdvanceInput {
  id: string;
  amountPaise: bigint;
  recoveryPerMonthPaise: bigint;
  balancePaise: bigint;
}

export interface EmployeeInput {
  id: string;
  code: string;
  name: string;
  employmentType: EmploymentType;
  doj: string;                     // Date of Joining: 'YYYY-MM-DD'
  dol?: string;                    // Date of Leaving: 'YYYY-MM-DD' (optional)
  isActive: boolean;
  stateCode?: string;              // State code for PT (e.g. 'MH')
}

export interface PayrollInput {
  employee: EmployeeInput;
  components: SalaryComponentInput[];
  attendance: AttendanceRow[];
  advances?: AdvanceInput[];
  period: Period;
  applyStatutory?: boolean;        // If true or if statutory components exist, evaluate statutory rules
}

export interface PayrollLine {
  componentCode: string;
  label: string;
  kind: ComponentKind;
  amountPaise: bigint;             // Pure integer paise
  explain: string;                 // Plain English description of inputs and arithmetic
}

export interface AdvanceRecoveryResult {
  advanceId: string;
  requestedRecoveryPaise: bigint;
  actualRecoveredPaise: bigint;
  remainingBalancePaise: bigint;
  explain: string;
}

export interface PayrollResult {
  employeeId: string;
  period: Period;
  attendanceSummary: AttendanceSummary;
  lines: PayrollLine[];
  grossPaise: bigint;
  deductionsPaise: bigint;
  advanceRecoveries: AdvanceRecoveryResult[];
  totalAdvanceRecoveredPaise: bigint;
  netPaise: bigint;                // Guaranteed netPaise >= 0n
  explain: string;
  warnings?: string[];             // Compliance warnings (e.g. Wage Code 50% rule)
}

