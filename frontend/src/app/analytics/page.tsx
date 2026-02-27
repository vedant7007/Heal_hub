"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Activity, CalendarCheck } from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, staggerContainer, staggerItem } from "@/components/shared/PageWrapper";
import { useCounter } from "@/hooks/use-counter";
import { getOverview, getPatients } from "@/lib/api";
import { toast } from "sonner";
import type { OverviewStats, Patient } from "@/types";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsContent />
    </AppShell>
  );
}

function AnalyticsContent() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState("30");

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, patientsRes] = await Promise.all([
        getOverview(),
        getPatients(),
      ]);
      setStats(overviewRes.data);
      setPatients(patientsRes.data || []);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 skeleton" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 skeleton" />)}
        </div>
      </div>
    );
  }

  // Build distribution data
  const dist = stats?.status_distribution || {};
  const distributionData = [
    { name: "Recovering", value: dist.green || 0, color: "#059669" },
    { name: "Attention", value: dist.yellow || 0, color: "#D97706" },
    { name: "At Risk", value: dist.red || 0, color: "#DC2626" },
    { name: "Critical", value: dist.critical || 0, color: "#7C3AED" },
  ].filter((d) => d.value > 0);

  // Symptom frequency
  const symptomCounts: Record<string, number> = {};
  patients.forEach((p) => {
    p.checkins?.forEach((c) => {
      c.symptoms_detected?.forEach((s) => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    });
  });
  const symptomData = Object.entries(symptomCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Surgery type breakdown
  const surgeryGroups: Record<string, number[]> = {};
  patients.forEach((p) => {
    if (!surgeryGroups[p.surgery_type]) surgeryGroups[p.surgery_type] = [];
    surgeryGroups[p.surgery_type].push(100 - (p.risk_score || 0));
  });
  const surgeryData = Object.entries(surgeryGroups).map(([name, scores]) => ({
    name: name.length > 15 ? name.slice(0, 15) + "..." : name,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
  }));

  const ranges = [
    { label: "7 days", value: "7" },
    { label: "30 days", value: "30" },
    { label: "90 days", value: "90" },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <div className="flex gap-1">
            {ranges.map((r) => (
              <motion.button
                key={r.value}
                whileTap={{ scale: 0.93 }}
                onClick={() => setRange(r.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium filter-pill ${range === r.value ? "bg-primary text-primary-foreground filter-pill-active" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
              >
                {r.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <MiniStat label="Total Patients" value={stats?.total_patients || 0} icon={Users} />
          <MiniStat label="Avg Recovery" value={stats?.avg_recovery_score || 0} suffix="%" icon={Activity} />
          <MiniStat label="Active Alerts" value={stats?.active_alerts || 0} icon={TrendingUp} />
          <MiniStat label="Check-ins Today" value={stats?.checkins_today || 0} icon={CalendarCheck} />
        </motion.div>

        {/* Charts grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Recovery by surgery type */}
          <motion.div variants={staggerItem} whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }} className="bg-card border border-border rounded-xl p-5 card-glow">
            <h3 className="text-sm font-semibold mb-4">Recovery by Surgery Type</h3>
            {surgeryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={surgeryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="avg" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} name="Avg Recovery %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Not enough data
              </div>
            )}
          </motion.div>

          {/* Patient Distribution */}
          <motion.div variants={staggerItem} whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }} className="bg-card border border-border rounded-xl p-5 card-glow">
            <h3 className="text-sm font-semibold mb-4">Patient Distribution</h3>
            {distributionData.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {distributionData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm">{d.name}</span>
                      <span className="text-sm font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No patient data
              </div>
            )}
          </motion.div>

          {/* Top Symptoms */}
          <motion.div variants={staggerItem} whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }} className="bg-card border border-border rounded-xl p-5 card-glow">
            <h3 className="text-sm font-semibold mb-4">Top Symptoms</h3>
            {symptomData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={symptomData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#D97706" radius={[0, 4, 4, 0]} barSize={14} name="Occurrences" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No symptom data
              </div>
            )}
          </motion.div>

          {/* Avg Recovery per surgery */}
          <motion.div variants={staggerItem} whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }} className="bg-card border border-border rounded-xl p-5 card-glow">
            <h3 className="text-sm font-semibold mb-4">Recovery Summary</h3>
            <div className="space-y-4">
              {surgeryData.length > 0 ? (
                surgeryData.map((s, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{s.name} <span className="text-muted-foreground">({s.count})</span></span>
                      <span className="font-semibold">{s.avg}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.avg}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${s.avg > 70 ? "bg-emerald-500" : s.avg > 40 ? "bg-amber-500" : "bg-red-500"
                          }`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Not enough data for summary
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}

function MiniStat({ label, value, suffix = "", icon: Icon }: { label: string; value: number; suffix?: string; icon: React.ElementType }) {
  const displayed = useCounter(value, 1000);
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
      className="bg-card border border-border rounded-xl p-4 card-glow"
    >
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.1 }}
          className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"
        >
          {/* @ts-expect-error - Icon type from lucide-react occasionally conflicts with Next.js strict mode in this pattern */}
          <Icon className="w-4 h-4 text-primary" />
        </motion.div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{displayed}{suffix}</p>
        </div>
      </div>
    </motion.div>
  );
}
