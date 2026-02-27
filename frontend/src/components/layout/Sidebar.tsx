"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  Heart,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] border-r border-[#334155]">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#334155]">
        <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Heal Hub</h1>
          <p className="text-xs text-[#94A3B8]">AI Patient Care</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                    : "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]"
                }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-[#334155]">
        <p className="text-xs text-[#64748B] text-center">
          Heal Hub v1.0 — HackWithAI 2026
        </p>
      </div>
    </aside>
  );
}
