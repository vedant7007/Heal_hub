"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getPatients, getOverview, getActiveAlerts } from "@/lib/api";
import { Patient, OverviewStats, Alert } from "@/types";
import StatsOverview from "@/components/dashboard/StatsOverview";
import PatientCard from "@/components/dashboard/PatientCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AlertBanner from "@/components/dashboard/AlertBanner";
import { motion } from "framer-motion";

const statusFilters = ["all", "green", "yellow", "red", "critical"];

export default function Dashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#1E293B] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#1E293B] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-[#1E293B] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsOverview stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#1E293B] border-[#334155] text-sm"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statusFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === f
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:text-white"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {patients.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <p className="text-[#64748B]">No patients found</p>
              </motion.div>
            ) : (
              patients.map((p, i) => <PatientCard key={p.id} patient={p} index={i} />)
            )}
          </div>
        </div>

        <div>
          <RecentActivity />
        </div>
      </div>

      <AlertBanner alerts={alerts} />
    </div>
  );
}
