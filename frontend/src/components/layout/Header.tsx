"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  X,
  LayoutDashboard,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { getActiveAlerts } from "@/lib/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const mobileNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    getActiveAlerts()
      .then((res) => setAlertCount(res.data?.length || 0))
      .catch(() => {});
  }, [pathname]);

  if (pathname === "/login") return null;

  const handleLogout = () => {
    localStorage.removeItem("healhub_token");
    router.push("/login");
  };

  return (
    <>
      <header className="relative flex items-center justify-between px-6 py-3 bg-[#0F172A]/60 backdrop-blur-xl border-b border-white/[0.05] z-40">
        {/* Subtle top-edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="flex items-center gap-4">
          {/* Mobile menu toggle */}
          <button
            className="md:hidden relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Search Bar */}
          <div className="relative hidden sm:block">
            {/* Focus glow ring */}
            <div
              className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500/40 to-cyan-500/40 blur-sm transition-opacity duration-300 ${
                searchFocused ? "opacity-100" : "opacity-0"
              }`}
            />
            <div className="relative">
              <Search
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                  searchFocused ? "text-blue-400" : "text-slate-500"
                }`}
              />
              <Input
                placeholder="Search patients, records..."
                className="pl-10 w-72 bg-white/[0.04] border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 rounded-xl focus:border-blue-500/30 focus:bg-white/[0.06] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <Link
            href="/alerts"
            className="relative p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200 group"
          >
            <Bell className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center">
                {/* Pulse ring */}
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/40 animate-ping" />
                {/* Badge */}
                <Badge className="relative h-[18px] min-w-[18px] flex items-center justify-center px-1 py-0 bg-gradient-to-r from-red-500 to-rose-500 text-[10px] font-bold border-0 shadow-[0_0_8px_rgba(239,68,68,0.4)] rounded-full">
                  {alertCount}
                </Badge>
              </span>
            )}
          </Link>

          {/* Separator */}
          <div className="w-px h-6 bg-white/[0.06] mx-1 hidden sm:block" />

          {/* Doctor Avatar & Info */}
          <div className="flex items-center gap-3 pl-1">
            <div className="relative group cursor-pointer">
              <Avatar className="h-9 w-9 ring-2 ring-white/[0.08] group-hover:ring-blue-500/30 transition-all duration-300">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-xs font-semibold">
                  DR
                </AvatarFallback>
              </Avatar>
              {/* Online status dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F172A] shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-200 leading-tight">
                Dr. Smith
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                Online
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200 ml-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              className="fixed top-[57px] left-0 right-0 z-50 md:hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="mx-3 mt-2 p-2 rounded-2xl bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40">
                {/* Mobile search */}
                <div className="px-2 pb-2 pt-1 sm:hidden">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Search patients..."
                      className="pl-10 w-full bg-white/[0.05] border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 rounded-xl"
                    />
                  </div>
                </div>

                <div className="border-t border-white/[0.05] sm:border-t-0" />

                {/* Nav links */}
                <nav className="p-1 space-y-0.5">
                  {mobileNavItems.map((item, index) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive
                              ? "text-white bg-gradient-to-r from-blue-500/[0.12] to-cyan-500/[0.06] border border-blue-500/[0.1]"
                              : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <item.icon
                            className={`w-[18px] h-[18px] ${
                              isActive ? "text-blue-400" : "text-slate-500"
                            }`}
                          />
                          {item.label}
                          {item.label === "Alerts" && alertCount > 0 && (
                            <Badge className="ml-auto h-5 min-w-[20px] flex items-center justify-center px-1.5 py-0 bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/20 rounded-full">
                              {alertCount}
                            </Badge>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Mobile logout */}
                <div className="border-t border-white/[0.05] mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/[0.08] rounded-xl transition-all duration-200"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
