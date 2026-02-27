"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Bell,
  BarChart3,
  UserCog,
  Settings,
  Moon,
  Sun,
  LogOut,
  HeartPulse,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Doctor } from "@/types";
import { useMounted } from "@/hooks/use-mounted";

interface SidebarProps {
  user: Doctor | null;
  role: "doctor" | "nurse";
  alertCount: number;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  section: string;
  badge?: number;
  doctorOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, section: "OVERVIEW" },
  { label: "Patients", href: "/patients", icon: Users, section: "OVERVIEW" },
  { label: "Appointments", href: "/appointments", icon: CalendarDays, section: "OVERVIEW" },
  { label: "Alerts", href: "/alerts", icon: Bell, section: "MONITORING" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, section: "MONITORING", doctorOnly: true },
  { label: "Nurses", href: "/nurses", icon: UserCog, section: "MANAGEMENT", doctorOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, section: "MANAGEMENT", doctorOnly: true },
];

export function Sidebar({ user, role, alertCount, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const mounted = useMounted();

  const filteredItems = navItems.filter((item) => !item.doctorOnly || role === "doctor");
  const sections = [...new Set(filteredItems.map((i) => i.section))];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const badge = item.label === "Alerts" ? alertCount : undefined;

    const content = (
      <motion.div
        whileHover={{ x: active ? 0 : 3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        <Link
          href={item.href}
          className={`
            group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
            ${active
              ? "bg-primary/8 text-primary nav-glow rounded-l-none"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }
          `}
        >
          <motion.div
            animate={active ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {/* @ts-expect-error - Icon typing conflict from lucide-react */}
            <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${active ? "text-primary" : "group-hover:text-foreground"}`} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {badge && badge > 0 && (
            <span className={`
              ${collapsed ? "absolute -top-1 -right-1" : "ml-auto"}
              inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
              bg-destructive text-white pulse-badge
            `}>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      </motion.div>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
            {badge ? ` (${badge})` : ""}
          </TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  const mobileItems = filteredItems.slice(0, 5);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-card border-r border-border z-30 overflow-hidden"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 px-4 h-16 shrink-0 group cursor-default"
          whileHover={{ scale: 1.01 }}
        >
          <motion.div
            className="w-9 h-9 rounded-xl shrink-0 relative overflow-hidden"
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
          >
            <Image src="/logo.jpeg" alt="Heal Hub" width={36} height={36} className="w-full h-full object-cover rounded-xl" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">Heal Hub</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">AI Recovery Platform</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {sections.map((section) => (
            <div key={section} className="mb-4">
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2"
                  >
                    {section}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {filteredItems
                  .filter((item) => item.section === section)
                  .map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto shrink-0 p-3 space-y-2">
          {/* Theme toggle */}
          {mounted && (
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {theme === "dark" ? (
                  <Sun className="w-[18px] h-[18px] shrink-0" />
                ) : (
                  <Moon className="w-[18px] h-[18px] shrink-0" />
                )}
              </motion.div>
              {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
            </motion.button>
          )}

          {/* Collapse toggle */}
          <motion.button
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {collapsed ? (
                <PanelLeft className="w-[18px] h-[18px] shrink-0" />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />
              )}
            </motion.div>
            {!collapsed && <span>Collapse</span>}
          </motion.button>

          <Separator />

          {/* User card */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 avatar-glow ${
              role === "nurse" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
            }`}>
              {user?.name?.[0] || (role === "nurse" ? "N" : "D")}
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium truncate">{user?.name || (role === "nurse" ? "Nurse" : "Doctor")}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {role === "nurse"
                      ? (user?.specialization || "Nursing Staff")
                      : (user?.specialization || "Specialist")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && "Logout"}
            </Button>
          </motion.div>
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            const badge = item.label === "Alerts" ? alertCount : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg relative transition-all duration-200 ${active ? "text-primary" : "text-muted-foreground active:scale-95"
                  }`}
              >
                <motion.div
                  animate={active ? { y: -2 } : { y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* @ts-expect-error - Icon typing conflict from lucide-react */}
                  <item.icon className="w-5 h-5" />
                </motion.div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                {badge && badge > 0 && (
                  <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-[16px] rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center px-1 pulse-badge">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
