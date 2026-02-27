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
  Stethoscope,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle, hasNotification: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className="hidden md:flex flex-col w-72 bg-[#0F172A]/80 backdrop-blur-xl border-r border-white/[0.06] relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-500/[0.05] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Logo Section */}
      <div className="flex items-center gap-3.5 px-6 py-6 border-b border-white/[0.06] relative">
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl opacity-20 blur-md animate-pulse" />
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Heart className="w-5 h-5 text-white animate-[heartbeat_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">
            Heal Hub
          </h1>
          <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
            AI Patient Care
          </p>
        </div>
      </div>

      {/* Navigation Label */}
      <div className="px-6 pt-6 pb-2">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.15em]">
          Main Menu
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block">
              <motion.div
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group
                  ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {/* Active indicator: gradient left border */}
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                {/* Active background glow */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/[0.12] to-cyan-500/[0.06] border border-blue-500/[0.1]" />
                )}

                {/* Hover glow (non-active) */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/[0.03] group-hover:border-white/[0.06]" />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  <item.icon
                    className={`w-[18px] h-[18px] transition-all duration-300 ${
                      isActive
                        ? "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]"
                        : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                </div>

                {/* Label */}
                <span className="relative z-10">{item.label}</span>

                {/* Notification dot for Alerts */}
                {item.hasNotification && (
                  <span className="relative z-10 ml-auto flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-5 border-t border-white/[0.05]" />

      {/* Doctor Profile Mini Card */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.08] transition-colors duration-300 cursor-pointer group">
          {/* Avatar */}
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/10">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F172A] shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
              Dr. Smith
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              General Physician
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <p className="text-[10px] text-slate-600 text-center tracking-wide">
          Heal Hub v1.0 — HackWithAI 2026
        </p>
      </div>

      {/* Heartbeat animation keyframes (injected via style) */}
      <style jsx global>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.15); }
          30% { transform: scale(1); }
          45% { transform: scale(1.1); }
          60% { transform: scale(1); }
        }
      `}</style>
    </aside>
  );
}
