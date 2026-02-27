"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Sun, Moon, Sunrise, Users, Plus } from "lucide-react";
import { getPatients, getOverview, getActiveAlerts } from "@/lib/api";
import { Patient, OverviewStats, Alert } from "@/types";
import StatsOverview from "@/components/dashboard/StatsOverview";
import PatientCard from "@/components/dashboard/PatientCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AlertBanner from "@/components/dashboard/AlertBanner";
import AddPatientDialog from "@/components/dashboard/AddPatientDialog";
import { motion } from "framer-motion";
import { format } from "date-fns";

const statusFilters = ["all", "green", "yellow", "red", "critical"];

const statusFilterColors: Record<string, string> = {
  all: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  red: "#EF4444",
  critical: "#EF4444",
};

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", icon: Sunrise };
  if (hour >= 12 && hour < 18) return { text: "Good afternoon", icon: Sun };
  return { text: "Good evening", icon: Moon };
}

export default function Dashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("healhub_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  useEffect(() => {
    loadPatients();
  }, [search, statusFilter]);

  const loadData = async () => {
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        getPatients(),
        getOverview(),
        getActiveAlerts(),
      ]);
      setPatients(pRes.data);
      setStats(sRes.data);
      setAlerts(aRes.data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await getPatients(params);
      setPatients(res.data);
    } catch {}
  };

  // Compute status counts from patient data
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { green: 0, yellow: 0, red: 0, critical: 0 };
    patients.forEach((p) => {
      if (counts[p.current_status] !== undefined) {
        counts[p.current_status]++;
      }
    });
    return counts;
  }, [patients]);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome skeleton */}
        <div className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white/[0.03] border border-white/[0.05] rounded-2xl animate-pulse"
            />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-12 bg-white/[0.03] rounded-2xl animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-white/[0.03] border border-white/[0.05] rounded-2xl animate-pulse"
              />
            ))}
          </div>
          <div className="h-[500px] bg-white/[0.03] border border-white/[0.05] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden"
      >
        <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl px-6 py-5">
          {/* Ambient gradient */}
          <div className="absolute top-0 right-0 w-80 h-40 bg-[#3B82F6]/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-60 h-30 bg-[#8B5CF6]/[0.03] rounded-full blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center">
                <GreetingIcon className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {greeting.text}, Dr. Sharma
                </h1>
                <p className="text-sm text-[#64748B] flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            {/* Quick stats + Add Patient */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span className="text-xs font-medium text-[#94A3B8]">
                    {stats?.total_patients || 0} patients
                  </span>
                </div>
                {(stats?.active_alerts || 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444]/[0.06] border border-[#EF4444]/15">
                    <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                    <span className="text-xs font-medium text-[#EF4444]">
                      {stats?.active_alerts} alert{(stats?.active_alerts || 0) > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setAddOpen(true)}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white border-0 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:translate-y-[-1px]"
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Patient</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alert Banner - show prominently after welcome */}
      <AlertBanner alerts={alerts} />

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List Section */}
        <motion.div
          className="lg:col-span-2 space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Search and Filters in glass container */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <Input
                  placeholder="Search patients by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/[0.04] border-white/[0.08] text-sm rounded-xl placeholder:text-[#475569] focus:border-[#3B82F6]/30 focus:ring-[#3B82F6]/10 transition-all duration-300"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {statusFilters.map((f) => {
                  const isActive = statusFilter === f;
                  const filterColor = statusFilterColors[f];

                  return (
                    <motion.button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                      style={{
                        backgroundColor: isActive ? `${filterColor}18` : "rgba(255,255,255,0.03)",
                        color: isActive ? filterColor : "#64748B",
                        border: `1px solid ${isActive ? `${filterColor}30` : "rgba(255,255,255,0.06)"}`,
                        boxShadow: isActive ? `0 0 12px ${filterColor}10` : "none",
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Status count pills */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
              <span className="text-[10px] font-medium text-[#475569] uppercase tracking-wider mr-1">
                Status:
              </span>
              {[
                { key: "green", label: "Green", color: "#22C55E" },
                { key: "yellow", label: "Yellow", color: "#EAB308" },
                { key: "red", label: "Red", color: "#EF4444" },
                { key: "critical", label: "Critical", color: "#EF4444" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                  style={{
                    backgroundColor: `${s.color}08`,
                    border: `1px solid ${s.color}15`,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: s.color }}
                  >
                    {statusCounts[s.key] || 0}
                  </span>
                  <span className="text-[10px] text-[#64748B]">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient cards */}
          <div className="space-y-2.5">
            {patients.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl py-16"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#475569]" />
                  </div>
                  <p className="text-sm text-[#475569]">No patients found</p>
                  {search && (
                    <p className="text-xs text-[#334155]">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              patients.map((p, i) => <PatientCard key={p.id} patient={p} index={i} />)
            )}
          </div>
        </motion.div>

        {/* Activity Feed Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <RecentActivity />
        </motion.div>
      </div>

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
