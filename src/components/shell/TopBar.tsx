// src/components/shell/TopBar.tsx
"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav-config";
import ProfileMenu from "./ProfileMenu";

export default function TopBar() {
  const pathname = usePathname();

  // On the home screen, the greeting row acts as the header with ProfileMenu
  if (pathname === "/") {
    return null;
  }

  const current = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  let title = current?.label ?? "Hajri";
  if (pathname.startsWith("/employees/new")) title = "Add Employee";
  else if (pathname.startsWith("/payroll/review")) title = "Review Run";
  else if (pathname.startsWith("/payroll/")) title = "Payslip Detail";
  else if (pathname.startsWith("/employees/")) title = "Employee Profile";
  else if (pathname.startsWith("/punch")) title = "Selfie Punch";
  else if (pathname === "/more") title = "Menu & Features";

  return (
    <header
      className="w-full flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)",
        paddingBottom: "12px",
      }}
    >
      {/* Left: Brand Icon + Title */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg font-bold text-white text-xs shadow-xs shrink-0"
          style={{ backgroundColor: "var(--accent)" }}
        >
          H
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </span>
      </div>

      {/* Right: Profile Menu with Settings and Logout */}
      <div className="flex items-center">
        <ProfileMenu size="sm" />
      </div>
    </header>
  );
}

