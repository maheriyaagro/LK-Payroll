// src/app/(app)/more/page.tsx
// Comprehensive App Menu hub accessible from the fixed bottom navigation "..." tab.

import Link from "next/link";
import {
  Users,
  UserPlus,
  CalendarCheck2,
  Banknote,
  FileCheck2,
  Receipt,
  Building2,
  ShieldCheck,
  Scale,
  LogOut,
  ChevronRight,
  Sparkles,
  Camera,
  MessageSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface MenuItem {
  label: string;
  description: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreMenuPage() {
  const sections: MenuSection[] = [
    {
      title: "Workforce Management",
      items: [
        {
          label: "Employee Directory",
          description: "View all staff, salaries, bank details & edit profiles",
          href: "/employees",
          icon: Users,
          badge: "8 Active",
          badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        },
        {
          label: "Add New Employee",
          description: "Onboard a new worker with wage structure & documents",
          href: "/employees/new",
          icon: UserPlus,
        },
        {
          label: "Attendance & OT Register",
          description: "Mark present, absent, overtime hours & half-days",
          href: "/attendance",
          icon: CalendarCheck2,
        },
        {
          label: "Selfie Punch Clock",
          description: "Camera face verification punch in/out with anti-spoof challenge",
          href: "/punch",
          icon: Camera,
          badge: "New",
          badgeColor: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
        },
      ],
    },
    {
      title: "Payroll & Salaries",
      items: [
        {
          label: "Payroll Dashboard",
          description: "Monthly salary calculations, draft runs & payslips",
          href: "/payroll",
          icon: Banknote,
          badge: "Sep 2026",
          badgeColor: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
        },
        {
          label: "Review & Approve Payroll",
          description: "Verify pre-run checks, duplicate banks & net totals",
          href: "/payroll/review?month=2026-09",
          icon: FileCheck2,
        },
        {
          label: "Advances & Deductions",
          description: "Track worker advance balances and automatic recovery",
          href: "/payroll",
          icon: Receipt,
        },
      ],
    },
    {
      title: "Statutory & Compliance",
      items: [
        {
          label: "PF, ESI & PT Statutory Engine",
          description: "Pure integer engine: 12% PF, 0.75% ESI & state tax rules",
          href: "/payroll",
          icon: Scale,
          badge: "Verified",
          badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        },
      ],
    },
    {
      title: "Organization & Settings",
      items: [
        {
          label: "WhatsApp Payslip Settings",
          description: "Cloud API utility templates, consent management & delivery logs",
          href: "/settings/whatsapp",
          icon: MessageSquare,
          badge: "New",
          badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        },
        {
          label: "Privacy & Data Protection",
          description: "Consent logs, personal data download & erasure requests",
          href: "/privacy",
          icon: ShieldCheck,
          badge: "DPDP",
          badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        },
        {
          label: "Business Profile & Registration",
          description: "Hajri Business - PAN, State compliance & GST info",
          href: "/onboarding",
          icon: Building2,
        },
        {
          label: "Roles & Access Control",
          description: "Owner, Manager, and Accountant permission policies",
          href: "#",
          icon: ShieldCheck,
          badge: "Owner",
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8 pt-3 max-w-4xl mx-auto w-full">
      {/* ── Business Profile Card ── */}
      <div
        className="p-4 rounded-2xl flex items-center justify-between"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0"
            style={{ backgroundColor: "var(--accent)" }}
          >
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text)]">Hajri Business</h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                Active Org
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Owner Account &bull; All Permissions
            </p>
          </div>
        </div>
      </div>

      {/* ── Menu Sections ── */}
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
            {section.title}
          </h3>
          <div
            className="rounded-2xl overflow-hidden divide-y divide-[var(--border)] shadow-sm"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href || "#"}
                  className="flex items-center justify-between p-3.5 hover:bg-[var(--surface-raised)] active:bg-[var(--surface-high)] transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: "var(--surface-raised)",
                        border: "1px solid var(--border)",
                        color: "var(--accent)",
                      }}
                    >
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[var(--text-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Log Out Button ── */}
      <div className="pt-2">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl font-semibold text-sm transition-all cursor-pointer active:scale-[0.99]"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            <LogOut size={16} />
            <span>Log Out from Hajri</span>
          </button>
        </form>
      </div>
    </div>
  );
}
