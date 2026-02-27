"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ArrowRight, Activity, Users } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, staggerContainer } from "@/components/shared/PageWrapper";
import { DashboardSkeleton } from "@/components/shared/Skeleton";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { PatientListItem } from "@/components/dashboard/PatientCard";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { AddPatientDialog } from "@/components/dashboard/AddPatientDialog";
import { Input } from "@/components/ui/input";
import { BentoCard } from "@/components/ui/BentoCard";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { getPatients, getOverview, getActiveAlerts } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useUser } from "@/lib/user-context";
import type { Patient, Alert, OverviewStats } from "@/types";

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Recovering", value: "green" },
  { label: "Attention", value: "yellow" },
  { label: "Critical", value: "red" },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, role } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Build user greeting
  const firstName = user?.name?.replace(/^Dr\.?\s*/i, "").split(" ")[0] || (role === "nurse" ? "Nurse" : "Doctor");
  const rolePrefix = role === "doctor" ? "Dr. " : "";

  const fetchData = useCallback(async () => {
    try {
      const [patientsRes, overviewRes, alertsRes] = await Promise.all([
        getPatients(),
        getOverview(),
        getActiveAlerts(),
      ]);
      setPatients(patientsRes.data || []);
      setStats(overviewRes.data || {
        total_patients: 0, active_alerts: 0, avg_recovery_score: 0, checkins_today: 0,
        status_distribution: {},
      });
      const alertData = alertsRes.data || [];
      setAlerts(alertData);

      const acts: ActivityItem[] = alertData.slice(0, 10).map((a: Alert, i: number) => ({
        id: a.id || String(i),
        type: a.level >= 3 ? "alert" as const : "status_change" as const,
        text: `${a.patient_name}: ${a.title}`,
        timestamp: a.created_at,
        patientName: a.patient_name,
      }));
      setActivities(acts);
    } catch {
      // Intentionally suppressed
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("new_checkin", () => fetchData());
    socket.on("new_alert", () => fetchData());
    return () => {
      socket.off("new_checkin");
      socket.off("new_alert");
    };
  }, [fetchData]);

  const filteredPatients = patients
    .filter((p) => statusFilter === "all" || p.current_status === statusFilter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Animated Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Welcome back, <span className="text-primary bg-clip-text">{rolePrefix}{firstName}</span>
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {role === "nurse"
              ? "Here\u2019s your patient care overview for today."
              : "Here\u2019s what\u2019s happening with your patients today."}
          </p>
        </motion.div>

        {/* Stats Row */}
        {stats && <StatsOverview stats={stats} />}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">

          {/* Main Patient List Bento */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="lg:col-span-8 flex flex-col h-full min-h-[500px]"
          >
            <BentoCard className="flex flex-col p-0 overflow-hidden glowColor='rgba(56, 189, 248, 0.15)'">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 pb-4 border-b border-border/50 bg-background/50">
                <div className="flex items-center gap-3 mb-4 sm:mb-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">Active Patients</h2>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link href="/patients" className="text-sm text-primary hover:underline font-medium flex items-center gap-1 transition-colors">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                  {role === "doctor" && (
                    <MagneticButton size="sm" onClick={() => setAddDialogOpen(true)} className="btn-premium shadow-lg shadow-primary/25">
                      <Plus className="w-4 h-4 mr-1.5" /> Add Patient
                    </MagneticButton>
                  )}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="px-6 py-4 space-y-4 bg-background/20">
                <div className="relative group max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or surgery..."
                    className="pl-9 h-10 bg-background/50 border-border/50 focus:bg-background transition-all"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map((f) => (
                    <motion.button
                      key={f.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatusFilter(f.value)}
                      className={`text-sm px-4 py-1.5 rounded-full font-medium filter-pill transition-all duration-300 ${statusFilter === f.value
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 filter-pill-active"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent hover:border-border"
                        }`}
                    >
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2">
                <AnimatePresence mode="popLayout">
                  {filteredPatients.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center"
                    >
                      <div className="p-4 rounded-full bg-secondary/50 mb-3">
                        <Search className="w-6 h-6 outline-none" />
                      </div>
                      <p>No patients match your filters.</p>
                    </motion.div>
                  ) : (
                    filteredPatients.slice(0, 8).map((p, i) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="px-4"
                      >
                        <PatientListItem patient={p} index={i} />
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </BentoCard>
          </motion.div>

          {/* Activity Feed Bento */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:col-span-4 flex flex-col h-full min-h-[400px]"
          >
            <BentoCard className="flex flex-col p-0 overflow-hidden" glowColor="rgba(139, 92, 246, 0.15)">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">Timeline</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <RecentActivity activities={activities} />
              </div>
            </BentoCard>
          </motion.div>
        </div>

        {/* Global Critical Alerts */}
        <div className="pt-4">
          <AlertBanner alerts={alerts} />
        </div>
      </div>

      <AddPatientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchData}
      />
    </PageWrapper>
  );
}
