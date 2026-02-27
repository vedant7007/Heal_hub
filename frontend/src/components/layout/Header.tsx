"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Doctor, Alert } from "@/types";
import Link from "next/link";
import { useMounted } from "@/hooks/use-mounted";

interface HeaderProps {
  user: Doctor | null;
  alerts: Alert[];
  onLogout: () => void;
  onMenuToggle?: () => void;
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Patients",
  "/appointments": "Appointments",
  "/alerts": "Alerts",
  "/analytics": "Analytics",
  "/nurses": "Nurses",
  "/settings": "Settings",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Header({ user, alerts, onLogout }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeAlerts = alerts.filter((a) => a.status !== "resolved");
  const title = pageTitles[pathname] || (pathname.startsWith("/patients/") ? "Patient Details" : "Dashboard");
  const greeting = getGreeting();

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Mobile menu + Page title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <motion.div
              animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.div>
          </Button>

          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {greeting}, {user?.name?.split(" ")[0] || "Doctor"}
            </p>
          </motion.div>
        </div>

        {/* Right: Search + Notifications + Theme + Avatar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <Input
                  placeholder="Search patients..."
                  className="h-9 text-sm"
                  autoFocus
                  onBlur={() => setSearchOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="w-4 h-4 text-muted-foreground" />
            </Button>
          </motion.div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <Bell className={`w-4 h-4 text-muted-foreground transition-all ${activeAlerts.length > 0 ? "bell-ring" : ""}`} />
                  {activeAlerts.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center px-1 pulse-badge"
                    >
                      {activeAlerts.length}
                    </motion.span>
                  )}
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-semibold">Notifications</p>
                <Link href="/alerts" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <DropdownMenuSeparator />
              {activeAlerts.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No active alerts
                </div>
              ) : (
                activeAlerts.slice(0, 5).map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <DropdownMenuItem asChild>
                      <Link href={`/patients/${alert.patient_id}`} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
                        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                          alert.level >= 3 ? "bg-destructive pulse-critical" : "bg-yellow-500 glow-yellow"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.patient_name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{alert.title}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      </Link>
                    </DropdownMenuItem>
                  </motion.div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          {mounted && (
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hidden md:flex"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  )}
                </motion.div>
              </Button>
            </motion.div>
          )}

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm avatar-glow transition-all duration-300"
              >
                {user?.name?.[0] || "D"}
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.name || "Doctor"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
