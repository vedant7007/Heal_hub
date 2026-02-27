"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Menu, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { getActiveAlerts } from "@/lib/api";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="flex items-center justify-between px-6 py-3 bg-[#0F172A] border-b border-[#334155]">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-[#94A3B8] hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <Input
            placeholder="Search patients..."
            className="pl-10 w-64 bg-[#1E293B] border-[#334155] text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/alerts" className="relative">
          <Bell className="w-5 h-5 text-[#94A3B8] hover:text-white transition-colors" />
          {alertCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-[#EF4444] text-[10px]">
              {alertCount}
            </Badge>
          )}
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#3B82F6] text-white text-xs">
              DR
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-[#94A3B8] hidden sm:block">Doctor</span>
        </div>
        <button onClick={handleLogout} className="text-[#64748B] hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#0F172A] border-b border-[#334155] p-4 z-50 md:hidden">
          <nav className="space-y-2">
            {[
              { href: "/", label: "Dashboard" },
              { href: "/patients", label: "Patients" },
              { href: "/alerts", label: "Alerts" },
              { href: "/analytics", label: "Analytics" },
              { href: "/settings", label: "Settings" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2 text-sm text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
