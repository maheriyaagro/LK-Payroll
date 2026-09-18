import {
  Home,
  CalendarCheck,
  Wallet,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Payroll", href: "/payroll", icon: Wallet },
  { label: "More", href: "/more", icon: MoreHorizontal },
];
