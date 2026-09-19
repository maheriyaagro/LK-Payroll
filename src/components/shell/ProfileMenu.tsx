// src/components/shell/ProfileMenu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building2,
  Grid,
} from "lucide-react";

interface ProfileMenuProps {
  size?: "sm" | "md";
}

export default function ProfileMenu({ size = "sm" }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const avatarDimensions = size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center rounded-full font-bold transition-all cursor-pointer select-none active:scale-95 ${avatarDimensions}`}
        style={{
          backgroundColor: isOpen ? "var(--accent)" : "var(--surface)",
          color: isOpen ? "#FFFFFF" : "var(--text)",
          border: isOpen
            ? "1.5px solid var(--accent)"
            : "1.5px solid var(--border)",
          boxShadow: isOpen
            ? "0 0 12px rgba(254, 87, 51, 0.35)"
            : "0 2px 6px rgba(0, 0, 0, 0.05)",
        }}
        aria-label="Profile and Settings"
      >
        U
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 sm:w-72 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 transition-all animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Header Info */}
          <div className="px-3 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] mb-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                style={{ backgroundColor: "var(--accent)" }}
              >
                H
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text)] truncate">Hajri Business</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">
                    Owner Account
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Item: All Features / Menu */}
          <Link
            href="/more"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--surface-raised)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                <Grid size={15} />
              </div>
              <span>All App Features</span>
            </div>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>

          {/* Menu Item: Settings */}
          <Link
            href="/more"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--surface-raised)] text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Settings size={15} />
              </div>
              <span>Settings & Organization</span>
            </div>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>

          {/* Divider */}
          <div className="my-1 border-t border-[var(--border)]" />

          {/* Sign Out Action inside Profile Button */}
          <form action="/api/auth/signout" method="POST" className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--negative)] hover:bg-[var(--negative)]/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[var(--negative)]/15 text-[var(--negative)]">
                  <LogOut size={15} />
                </div>
                <span>Log Out</span>
              </div>
              <ChevronRight size={14} className="opacity-50" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
