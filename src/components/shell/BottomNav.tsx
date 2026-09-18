"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { navItems } from "@/lib/nav-config";

export default function BottomNav() {
  const pathname = usePathname();

  const isAddActive = pathname.startsWith("/employees/new");

  const renderTab = (item: (typeof navItems)[0]) => {
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center justify-center transition-all duration-300 group ${
          isActive
            ? "px-3.5 min-[400px]:px-4 min-[500px]:px-5 w-auto"
            : "w-[38px] min-[400px]:w-[42px] min-[500px]:w-[46px]"
        } h-[38px] min-[400px]:h-[42px] min-[500px]:h-[46px]`}
        style={{
          borderRadius: "var(--radius-pill)",
          backgroundColor: isActive
            ? "var(--accent)"
            : "rgba(255, 255, 255, 0.06)",
          color: isActive ? "#FFFFFF" : "var(--text-muted)",
          boxShadow: isActive
            ? "0 4px 14px rgba(254, 87, 51, 0.45)"
            : "none",
        }}
        aria-label={item.label}
      >
        <div className="flex items-center gap-1.5 min-[500px]:gap-2">
          <Icon
            strokeWidth={isActive ? 2.3 : 1.9}
            style={{
              color: isActive ? "#FFFFFF" : "var(--text-muted)",
            }}
            className="w-[17px] h-[17px] min-[400px]:w-[18px] min-[400px]:h-[18px] min-[500px]:w-[20px] min-[500px]:h-[20px] shrink-0 transition-colors group-hover:text-white"
          />
          {isActive && (
            <span
              className="text-[11px] min-[400px]:text-xs min-[500px]:text-sm font-semibold tracking-wide whitespace-nowrap"
              style={{ color: "#FFFFFF" }}
            >
              {item.label}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <nav
      className="fixed z-50 flex justify-center md:hidden pointer-events-none"
      style={{
        bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
        left: 0,
        right: 0,
      }}
    >
      <div
        className="pointer-events-auto flex items-center gap-1 min-[400px]:gap-1.5 min-[500px]:gap-2 p-1 min-[400px]:p-1.5 transition-all duration-300 shadow-2xl"
        style={{
          backgroundColor: "rgba(22, 22, 24, 0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "var(--radius-pill)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 10px 36px rgba(0, 0, 0, 0.6), 0 2px 10px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Navigation items: Home, Attendance, Payroll, More */}
        {navItems.map(renderTab)}

        {/* Last item: Add New Employee Button */}
        <Link
          href="/employees/new"
          className={`flex items-center justify-center transition-all duration-300 group ${
            isAddActive
              ? "px-3.5 min-[400px]:px-4 min-[500px]:px-5 w-auto"
              : "w-[38px] min-[400px]:w-[42px] min-[500px]:w-[46px]"
          } h-[38px] min-[400px]:h-[42px] min-[500px]:h-[46px]`}
          style={{
            borderRadius: "var(--radius-pill)",
            backgroundColor: isAddActive
              ? "var(--accent)"
              : "rgba(254, 87, 51, 0.16)",
            border: isAddActive
              ? "1px solid transparent"
              : "1px solid rgba(254, 87, 51, 0.38)",
            color: isAddActive ? "#FFFFFF" : "var(--accent)",
            boxShadow: isAddActive
              ? "0 4px 14px rgba(254, 87, 51, 0.45)"
              : "0 2px 8px rgba(254, 87, 51, 0.2)",
          }}
          aria-label="Add new employee"
        >
          <div className="flex items-center gap-1.5 min-[500px]:gap-2">
            <Plus
              strokeWidth={2.4}
              style={{
                color: isAddActive ? "#FFFFFF" : "var(--accent)",
              }}
              className="w-[17px] h-[17px] min-[400px]:w-[19px] min-[400px]:h-[19px] min-[500px]:w-[21px] min-[500px]:h-[21px] shrink-0 transition-transform group-hover:scale-110"
            />
            {isAddActive && (
              <span
                className="text-[11px] min-[400px]:text-xs min-[500px]:text-sm font-semibold tracking-wide whitespace-nowrap"
                style={{ color: "#FFFFFF" }}
              >
                Add
              </span>
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
}
