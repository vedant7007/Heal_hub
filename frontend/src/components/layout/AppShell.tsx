"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { getMe, getActiveAlerts } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { UserProvider } from "@/lib/user-context";
import { toast } from "sonner";
import type { Doctor, Alert } from "@/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Doctor | null>(null);
  const [role, setRole] = useState<"doctor" | "nurse">("doctor");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await getActiveAlerts();
      setAlerts(res.data || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("healhub_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const init = async () => {
      try {
        const res = await getMe();
        setUser(res.data);
        setRole(res.data.role || "doctor");
        await fetchAlerts();
      } catch {
        localStorage.removeItem("healhub_token");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [router, fetchAlerts]);

  // Socket.io real-time events
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    socket.on("new_alert", (data: Alert) => {
      setAlerts((prev) => [data, ...prev]);
      toast.error(`Alert: ${data.title}`, { description: data.patient_name });
    });

    socket.on("status_change", () => {
      fetchAlerts();
    });

    socket.on("alert_updated", () => {
      fetchAlerts();
    });

    return () => {
      socket.off("new_alert");
      socket.off("status_change");
      socket.off("alert_updated");
    };
  }, [user, fetchAlerts]);

  const handleLogout = () => {
    localStorage.removeItem("healhub_token");
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const alertCount = alerts.filter((a) => a.status !== "resolved").length;

  return (
    <UserProvider user={user} role={role}>
      <div className="flex min-h-screen">
        <Sidebar user={user} role={role} alertCount={alertCount} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header user={user} alerts={alerts} onLogout={handleLogout} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
