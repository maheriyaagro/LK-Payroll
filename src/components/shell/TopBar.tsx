"use client";

import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { navItems } from "@/lib/nav-config";

export default function TopBar() {
  const pathname = usePathname();

  // On the home screen, the greeting row acts as the header (matching reference design)
  if (pathname === "/") {
    return null;
  }

  const current = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  const title = current?.label ?? "Hajri";

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4"
      style={{
        height: 56,
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Left: menu icon (mobile only) */}
      <button
        className="flex items-center justify-center md:hidden"
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-card)",
          color: "var(--text)",
        }}
        aria-label="Menu"
      >
        <Menu size={22} />
      </button>

      {/* Centre: title */}
      <span
        className="absolute left-1/2 md:static md:left-auto"
        style={{
          transform: "translateX(-50%)",
          fontWeight: 600,
          fontSize: 17,
          color: "var(--text)",
        }}
      >
        {title}
      </span>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">
        <button
          className="relative flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-card)",
            color: "var(--text-muted)",
          }}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {/* Notification dot */}
          <span
            className="absolute"
            style={{
              top: 10,
              right: 10,
              width: 8,
              height: 8,
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--accent)",
              border: "2px solid var(--bg)",
            }}
          />
        </button>

        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--surface-high)",
            color: "var(--text-muted)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          U
        </div>
      </div>
    </header>
  );
}
