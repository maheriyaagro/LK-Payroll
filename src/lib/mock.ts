export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: "present" | "absent" | "half-day" | "late" | "on-leave";
  inTime: string;
  outTime: string;
  hours: string;
}

export const employees: Employee[] = [
  { id: "1", name: "Rajesh Kumar", role: "Mason", initials: "RK", status: "present", inTime: "08:00", outTime: "17:00", hours: "9h 00m" },
  { id: "2", name: "Amit Sharma", role: "Electrician", initials: "AS", status: "present", inTime: "08:15", outTime: "17:30", hours: "9h 15m" },
  { id: "3", name: "Priya Patel", role: "Supervisor", initials: "PP", status: "late", inTime: "09:45", outTime: "17:00", hours: "7h 15m" },
  { id: "4", name: "Suresh Yadav", role: "Labourer", initials: "SY", status: "absent", inTime: "—", outTime: "—", hours: "—" },
  { id: "5", name: "Deepa Nair", role: "Painter", initials: "DN", status: "present", inTime: "08:00", outTime: "17:00", hours: "9h 00m" },
  { id: "6", name: "Vikram Singh", role: "Plumber", initials: "VS", status: "half-day", inTime: "08:00", outTime: "13:00", hours: "5h 00m" },
  { id: "7", name: "Anita Devi", role: "Helper", initials: "AD", status: "on-leave", inTime: "—", outTime: "—", hours: "—" },
  { id: "8", name: "Manoj Tiwari", role: "Carpenter", initials: "MT", status: "present", inTime: "07:45", outTime: "17:00", hours: "9h 15m" },
];

export const homeStats = {
  monthlyPayrollPaise: 48250000,
  payrollDeltaPercent: 6.2,
  presentToday: 23,
  totalWorkers: 28,
  advancesPaise: 1240000,
};

export type AttendanceTab = "today" | "late" | "absent" | "on-leave";

export const attendanceTabs: { key: AttendanceTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "on-leave", label: "On leave" },
];

export function formatPaise(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  return `₹${paise < 0 ? "-" : ""}${rupees.toLocaleString("en-IN")}`;
}

export const statusStyles: Record<
  Employee["status"],
  { label: string; bg: string; color: string }
> = {
  present: {
    label: "Present",
    bg: "color-mix(in srgb, var(--positive) 12%, transparent)",
    color: "var(--positive)",
  },
  absent: {
    label: "Absent",
    bg: "color-mix(in srgb, var(--negative) 12%, transparent)",
    color: "var(--negative)",
  },
  late: {
    label: "Late",
    bg: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
    color: "var(--accent-2)",
  },
  "half-day": {
    label: "Half-day",
    bg: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
    color: "var(--accent-2)",
  },
  "on-leave": {
    label: "On leave",
    bg: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
    color: "var(--text-muted)",
  },
};

export type AttendanceOption = "P" | "H" | "A" | "OT";

export interface AttendanceWorker {
  id: string;
  name: string;
  role: string;
  initials: string;
  initialStatus: AttendanceOption | null;
  otHours?: number;
}

export const attendanceWorkers: AttendanceWorker[] = [
  { id: "1", name: "Rajesh Kumar", role: "Mason", initials: "RK", initialStatus: "P" },
  { id: "2", name: "Amit Sharma", role: "Electrician", initials: "AS", initialStatus: "P" },
  { id: "3", name: "Priya Patel", role: "Supervisor", initials: "PP", initialStatus: "P" },
  { id: "4", name: "Suresh Yadav", role: "Labourer", initials: "SY", initialStatus: "A" },
  { id: "5", name: "Deepa Nair", role: "Painter", initials: "DN", initialStatus: "P" },
  { id: "6", name: "Vikram Singh", role: "Plumber", initials: "VS", initialStatus: "H" },
  { id: "7", name: "Anita Devi", role: "Helper", initials: "AD", initialStatus: "H" },
  { id: "8", name: "Manoj Tiwari", role: "Carpenter", initials: "MT", initialStatus: "P" },
  { id: "9", name: "Rakesh Verma", role: "Welder", initials: "RV", initialStatus: "P" },
  { id: "10", name: "Sunita Rao", role: "Safety Officer", initials: "SR", initialStatus: "P" },
  { id: "11", name: "Dharmendra Pal", role: "Fitter", initials: "DP", initialStatus: "P" },
  { id: "12", name: "Pooja Gupta", role: "Quality Lead", initials: "PG", initialStatus: "P" },
  { id: "13", name: "Imran Khan", role: "Driver", initials: "IK", initialStatus: "P" },
  { id: "14", name: "Kavita Mehra", role: "Security", initials: "KM", initialStatus: "P" },
  { id: "15", name: "Rohit Sen", role: "Mason", initials: "RS", initialStatus: "P" },
  { id: "16", name: "Manju Bala", role: "Helper", initials: "MB", initialStatus: "P" },
  { id: "17", name: "Arvind Joshi", role: "Mechanic", initials: "AJ", initialStatus: "OT", otHours: 3 },
  { id: "18", name: "Geeta Solanki", role: "Storekeeper", initials: "GS", initialStatus: "P" },
  { id: "19", name: "Ashok Pandey", role: "Electrician", initials: "AP", initialStatus: "P" },
  { id: "20", name: "Neha Choudhary", role: "Surveyor", initials: "NC", initialStatus: "P" },
  { id: "21", name: "Ramesh Chauhan", role: "Bar Bender", initials: "RC", initialStatus: "P" },
  { id: "22", name: "Santosh Jha", role: "Labourer", initials: "SJ", initialStatus: "P" },
  { id: "23", name: "Dinesh Maurya", role: "Painter", initials: "DM", initialStatus: "P" },
  { id: "24", name: "Harish Bind", role: "Helper", initials: "HB", initialStatus: null },
  { id: "25", name: "Rekha Varma", role: "Cleaning", initials: "RV", initialStatus: null },
  { id: "26", name: "Pankaj Kashyap", role: "Plumber", initials: "PK", initialStatus: null },
  { id: "27", name: "Suman Rawat", role: "Cook", initials: "SR", initialStatus: null },
  { id: "28", name: "Balram Nishad", role: "Security", initials: "BN", initialStatus: null },
];

export interface DayChipItem {
  key: string;
  dayName: string;
  dateNum: number;
  isToday: boolean;
}

export const mockWeekDays: DayChipItem[] = [
  { key: "d1", dayName: "Sat", dateNum: 12, isToday: false },
  { key: "d2", dayName: "Sun", dateNum: 13, isToday: false },
  { key: "d3", dayName: "Mon", dateNum: 14, isToday: false },
  { key: "d4", dayName: "Tue", dateNum: 15, isToday: false },
  { key: "d5", dayName: "Wed", dateNum: 16, isToday: false },
  { key: "d6", dayName: "Thu", dateNum: 17, isToday: false },
  { key: "d7", dayName: "Fri", dateNum: 18, isToday: true },
];

export interface BreakdownItem {
  id: string;
  label: string;
  amountPaise: number;
  explainer?: string;
}

export interface EmployeePayroll {
  id: string;
  empCode: string;
  name: string;
  role: string;
  initials: string;
  daysWorked: number;
  totalDays: number;
  netPayPaise: number;
  earnings: BreakdownItem[];
  deductions: BreakdownItem[];
  bankAccount: string;
  ifsc: string;
  status: "Draft" | "Approved" | "Paid";
}

export const payrollMonths = [
  { key: "jun", label: "Jun 2026", isCurrent: false },
  { key: "jul", label: "Jul 2026", isCurrent: false },
  { key: "aug", label: "Aug 2026", isCurrent: false },
  { key: "sep", label: "Sep 2026", isCurrent: true },
  { key: "oct", label: "Oct 2026", isCurrent: false },
];

export const payrollRecords: EmployeePayroll[] = [
  {
    id: "1",
    empCode: "EMP-0101",
    name: "Rajesh Kumar",
    role: "Mason",
    initials: "RK",
    daysWorked: 26,
    totalDays: 26,
    netPayPaise: 1982500,
    bankAccount: "•••• 4892",
    ifsc: "SBIN0004211",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1600000 },
      { id: "e2", label: "Dearness Allowance (DA)", amountPaise: 240000 },
      { id: "e3", label: "Overtime (8 hrs @ ₹150/hr)", amountPaise: 120000 },
      { id: "e4", label: "Attendance Bonus", amountPaise: 100000 },
      { id: "e5", label: "Travel Reimbursement", amountPaise: 50000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 192000,
        explainer: "12% of basic wage (₹16,000) deposited to EPFO account, matched equally by company.",
      },
      {
        id: "d2",
        label: "ESIC Health Insurance",
        amountPaise: 15500,
        explainer: "0.75% of gross earnings (₹20,600) providing cashless medical coverage across ESIC hospitals.",
      },
      {
        id: "d3",
        label: "Salary Advance Repayment",
        amountPaise: 100000,
        explainer: "Partial recovery of ₹2,500 emergency mid-month cash advance taken on 6 Sep 2026.",
      },
      {
        id: "d4",
        label: "Professional Tax (PT)",
        amountPaise: 20000,
        explainer: "State government statutory employment tax deducted per income slab.",
      },
    ],
  },
  {
    id: "2",
    empCode: "EMP-0102",
    name: "Amit Sharma",
    role: "Electrician",
    initials: "AS",
    daysWorked: 25,
    totalDays: 26,
    netPayPaise: 2241000,
    bankAccount: "•••• 7319",
    ifsc: "HDFC0001092",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1850000 },
      { id: "e2", label: "Special Allowance", amountPaise: 350000 },
      { id: "e3", label: "Overtime (12 hrs @ ₹180/hr)", amountPaise: 216000 },
      { id: "e4", label: "Tool Maintenance Allowance", amountPaise: 80000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 222000,
        explainer: "12% of basic wage (₹18,500) contribution to Employee Provident Fund.",
      },
      {
        id: "d2",
        label: "ESIC Health Insurance",
        amountPaise: 18700,
        explainer: "0.75% of gross earnings (₹24,960) under Employee State Insurance Act.",
      },
      {
        id: "d3",
        label: "Unpaid Leave (1 day)",
        amountPaise: 95300,
        explainer: "1 day unapproved absence deducted at daily gross rate: ₹24,960 ÷ 26 days = ₹953.",
      },
    ],
  },
  {
    id: "3",
    empCode: "EMP-0103",
    name: "Priya Patel",
    role: "Supervisor",
    initials: "PP",
    daysWorked: 26,
    totalDays: 26,
    netPayPaise: 2865000,
    bankAccount: "•••• 1104",
    ifsc: "ICIC0000452",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Salary", amountPaise: 2200000 },
      { id: "e2", label: "House Rent Allowance (HRA)", amountPaise: 500000 },
      { id: "e3", label: "Site Supervisor Allowance", amountPaise: 350000 },
      { id: "e4", label: "Safety Performance Incentive", amountPaise: 150000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 264000,
        explainer: "12% of basic salary (₹22,000) credited toward pension and retirement corpus.",
      },
      {
        id: "d2",
        label: "Professional Tax (PT)",
        amountPaise: 20000,
        explainer: "Statutory state employment tax per government slab rate.",
      },
      {
        id: "d3",
        label: "TDS / Income Tax",
        amountPaise: 50000,
        explainer: "Tax deducted at source based on estimated annual income under new tax regime.",
      },
    ],
  },
  {
    id: "4",
    empCode: "EMP-0104",
    name: "Suresh Yadav",
    role: "Labourer",
    initials: "SY",
    daysWorked: 22,
    totalDays: 26,
    netPayPaise: 1375000,
    bankAccount: "•••• 8901",
    ifsc: "PUNB0182700",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1400000 },
      { id: "e2", label: "Daily Allowance", amountPaise: 220000 },
      { id: "e3", label: "Overtime (4 hrs)", amountPaise: 50000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 168000,
        explainer: "12% of basic wage (₹14,000) deposited into EPFO account.",
      },
      {
        id: "d2",
        label: "Advance Repayment",
        amountPaise: 100000,
        explainer: "Settlement of remaining balance on grocery advance voucher issued on 1st Sep.",
      },
      {
        id: "d3",
        label: "Absence Deduction (4 days)",
        amountPaise: 27000,
        explainer: "4 unpaid absent days deducted proportionally: (Basic + DA) ÷ 26 × 4 days.",
      },
    ],
  },
  {
    id: "5",
    empCode: "EMP-0105",
    name: "Deepa Nair",
    role: "Painter",
    initials: "DN",
    daysWorked: 26,
    totalDays: 26,
    netPayPaise: 1820000,
    bankAccount: "•••• 3328",
    ifsc: "KKBK0000182",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1550000 },
      { id: "e2", label: "Special Finishing Allowance", amountPaise: 250000 },
      { id: "e3", label: "Full Attendance Bonus", amountPaise: 100000 },
      { id: "e4", label: "Safety Gear Stipend", amountPaise: 70000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 186000,
        explainer: "12% statutory basic wage contribution for retirement security.",
      },
      {
        id: "d2",
        label: "ESIC Health Insurance",
        amountPaise: 14800,
        explainer: "0.75% of gross earnings (₹19,700) for ESI medical benefits.",
      },
    ],
  },
  {
    id: "6",
    empCode: "EMP-0106",
    name: "Vikram Singh",
    role: "Plumber",
    initials: "VS",
    daysWorked: 24,
    totalDays: 26,
    netPayPaise: 1745000,
    bankAccount: "•••• 6542",
    ifsc: "BARB0VISHAL",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1650000 },
      { id: "e2", label: "Tool Maintenance Allowance", amountPaise: 150000 },
      { id: "e3", label: "Overtime (6 hrs)", amountPaise: 90000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 198000,
        explainer: "12% of basic wage (₹16,500) employee retirement contribution.",
      },
      {
        id: "d2",
        label: "Half-day Penalty (2 days)",
        amountPaise: 72000,
        explainer: "2 recorded half-days deducted at half standard daily rate.",
      },
    ],
  },
  {
    id: "7",
    empCode: "EMP-0107",
    name: "Anita Devi",
    role: "Helper",
    initials: "AD",
    daysWorked: 23,
    totalDays: 26,
    netPayPaise: 1290000,
    bankAccount: "•••• 9012",
    ifsc: "UBIN0532109",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1350000 },
      { id: "e2", label: "Conveyance Allowance", amountPaise: 120000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 162000,
        explainer: "12% of basic wage (₹13,500) statutory EPF deduction.",
      },
      {
        id: "d2",
        label: "ESIC Health Insurance",
        amountPaise: 11000,
        explainer: "0.75% of gross wages (₹14,700) for ESI medical card.",
      },
    ],
  },
  {
    id: "8",
    empCode: "EMP-0108",
    name: "Manoj Tiwari",
    role: "Carpenter",
    initials: "MT",
    daysWorked: 26,
    totalDays: 26,
    netPayPaise: 2060000,
    bankAccount: "•••• 2244",
    ifsc: "IDIB000M123",
    status: "Draft",
    earnings: [
      { id: "e1", label: "Basic Wage", amountPaise: 1750000 },
      { id: "e2", label: "Skill Mastery Allowance", amountPaise: 300000 },
      { id: "e3", label: "Overtime (10 hrs)", amountPaise: 160000 },
      { id: "e4", label: "Punctuality Bonus", amountPaise: 80000 },
    ],
    deductions: [
      {
        id: "d1",
        label: "Provident Fund (EPF)",
        amountPaise: 210000,
        explainer: "12% of basic wage (₹17,500) credited to employee PF passbook.",
      },
      {
        id: "d2",
        label: "Advance Repayment",
        amountPaise: 80000,
        explainer: "Scheduled monthly installment on annual festival salary advance.",
      },
    ],
  },
];


