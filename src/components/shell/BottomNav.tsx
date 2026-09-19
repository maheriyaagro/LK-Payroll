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
            ? "px-4 min-[400px]:px-5 min-[500px]:px-6 w-auto"
            : "w-[46px] min-[400px]:w-[50px] min-[500px]:w-[54px]"
        } h-[46px] min-[400px]:h-[50px] min-[500px]:h-[54px]`}
        style={{
          borderRadius: "var(--radius-pill)",
          backgroundColor: isActive
            ? "var(--accent)"
            : "rgba(255, 255, 255, 0.08)",
          color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
          boxShadow: isActive
            ? "0 4px 16px rgba(254, 87, 51, 0.45)"
            : "none",
        }}
        aria-label={item.label}
      >
        <div className="flex items-center gap-2">
          <Icon
            strokeWidth={isActive ? 2.4 : 2.0}
            style={{
              color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.78)",
            }}
            className="w-[20px] h-[20px] min-[400px]:w-[22px] min-[400px]:h-[22px] shrink-0 transition-colors group-hover:text-white"
          />
          {isActive && (
            <span
              className="text-xs min-[400px]:text-sm font-bold tracking-wide whitespace-nowrap"
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
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: 0,
        right: 0,
      }}
    >
      <div
        className="pointer-events-auto flex items-center gap-1.5 min-[400px]:gap-2 p-1.5 min-[400px]:p-2 transition-all duration-300 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(32, 34, 40, 0.96) 0%, rgba(18, 20, 25, 0.98) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "var(--radius-pill)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Navigation items: Home, Attendance, Payroll, More */}
        {navItems.map(renderTab)}

        {/* Last item: Add New Employee Button */}
        <Link
          href="/employees/new"
          className={`flex items-center justify-center transition-all duration-300 group ${
            isAddActive
              ? "px-4 min-[400px]:px-5 min-[500px]:px-6 w-auto"
              : "w-[46px] min-[400px]:w-[50px] min-[500px]:w-[54px]"
          } h-[46px] min-[400px]:h-[50px] min-[500px]:h-[54px]`}
          style={{
            borderRadius: "var(--radius-pill)",
            backgroundColor: isAddActive
              ? "var(--accent)"
              : "rgba(254, 87, 51, 0.22)",
            border: isAddActive
              ? "1px solid transparent"
              : "1px solid rgba(254, 87, 51, 0.5)",
            color: isAddActive ? "#FFFFFF" : "#FF7A59",
            boxShadow: isAddActive
              ? "0 4px 16px rgba(254, 87, 51, 0.45)"
              : "0 2px 10px rgba(254, 87, 51, 0.25)",
          }}
          aria-label="Add new employee"
        >
          <div className="flex items-center gap-2">
            <Plus
              strokeWidth={2.5}
              style={{
                color: isAddActive ? "#FFFFFF" : "#FF7A59",
              }}
              className="w-[20px] h-[20px] min-[400px]:w-[22px] min-[400px]:h-[22px] shrink-0 transition-transform group-hover:scale-110"
            />
            {isAddActive && (
              <span
                className="text-xs min-[400px]:text-sm font-bold tracking-wide whitespace-nowrap"
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
