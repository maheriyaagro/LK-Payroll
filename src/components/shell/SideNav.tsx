"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { navItems } from "@/lib/nav-config";

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50"
      style={{
        width: 240,
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-card)",
            backgroundColor: "var(--accent)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          H
        </div>
        <span
          className="text-h1"
          style={{ color: "var(--text)" }}
        >
          Hajri
        </span>
      </div>

      {/* Quick Add Button on Desktop */}
      <div className="px-4 mt-1 mb-2">
        <Link
          href="/employees/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95"
          style={{
            backgroundColor: pathname.startsWith("/employees/new") ? "var(--surface-high)" : "var(--accent)",
            color: "#FFFFFF",
            boxShadow: pathname.startsWith("/employees/new") ? "none" : "0 2px 10px rgba(254, 87, 51, 0.35)",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Employee</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                borderRadius: "var(--radius-card)",
                backgroundColor: isActive
                  ? "var(--accent-soft)"
                  : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 15,
                transition: "all 0.2s ease",
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Avatar at bottom */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--surface-high)",
            color: "var(--text-muted)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          U
        </div>
        <div className="flex flex-col">
          <span
            className="text-body"
            style={{ color: "var(--text)", fontWeight: 500 }}
          >
            User
          </span>
          <span className="text-caption" style={{ color: "var(--text-muted)" }}>
            Admin
          </span>
        </div>
      </div>
    </aside>
  );
}
