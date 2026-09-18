import type { Employee } from "@/lib/mock";
import { statusStyles } from "@/lib/mock";

interface EmployeeListProps {
  employees: Employee[];
}

function StatusChip({ status }: { status: Employee["status"] }) {
  const s = statusStyles[status];
  return (
    <span
      className="text-caption whitespace-nowrap"
      style={{
        padding: "4px 10px",
        borderRadius: "var(--radius-pill)",
        backgroundColor: s.bg,
        color: s.color,
        fontWeight: 500,
      }}
    >
      {s.label}
    </span>
  );
}

/* ── Mobile / Tablet card list ── */
function CardList({ employees }: EmployeeListProps) {
  return (
    <div className="flex flex-col gap-2 lg:hidden">
      {employees.map((emp) => (
        <div
          key={emp.id}
          className="flex items-center gap-3"
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-card)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--surface-high)",
              color: "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {emp.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-body truncate"
              style={{ fontWeight: 500, color: "var(--text)" }}
            >
              {emp.name}
            </p>
            <p className="text-caption" style={{ color: "var(--text-muted)" }}>
              {emp.role}
            </p>
          </div>
          <StatusChip status={emp.status} />
        </div>
      ))}
    </div>
  );
}

/* ── Desktop table ── */
function Table({ employees }: EmployeeListProps) {
  return (
    <div
      className="hidden lg:block overflow-x-auto"
      style={{
        borderRadius: "var(--radius-card)",
        backgroundColor: "var(--surface)",
      }}
    >
      <table className="w-full text-left" style={{ fontSize: 14 }}>
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <th className="text-caption px-4 py-3 font-medium">Name</th>
            <th className="text-caption px-4 py-3 font-medium">Role</th>
            <th className="text-caption px-4 py-3 font-medium">In</th>
            <th className="text-caption px-4 py-3 font-medium">Out</th>
            <th className="text-caption px-4 py-3 font-medium">Hours</th>
            <th className="text-caption px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr
              key={emp.id}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-pill)",
                      backgroundColor: "var(--surface-high)",
                      color: "var(--text-muted)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {emp.initials}
                  </div>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>
                    {emp.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                {emp.role}
              </td>
              <td className="px-4 py-3" style={{ color: "var(--text)" }}>
                {emp.inTime}
              </td>
              <td className="px-4 py-3" style={{ color: "var(--text)" }}>
                {emp.outTime}
              </td>
              <td className="px-4 py-3" style={{ color: "var(--text)" }}>
                {emp.hours}
              </td>
              <td className="px-4 py-3">
                <StatusChip status={emp.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EmployeeList({ employees }: EmployeeListProps) {
  return (
    <>
      <CardList employees={employees} />
      <Table employees={employees} />
    </>
  );
}
