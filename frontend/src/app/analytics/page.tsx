"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getRecoveryTrends, getComplications, getOverview } from "@/lib/api";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend,
} from "recharts";

const COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#EF4444", "#8B5CF6", "#EC4899"];

const tooltipStyle = {
  backgroundColor: "#1E293B",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#F8FAFC",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [trends, setTrends] = useState<{ surgery_type: string; avg_recovery_score: number; patient_count: number }[]>([]);
  const [complications, setComplications] = useState<{ symptom: string; count: number }[]>([]);
  const [overview, setOverview] = useState<{ status_distribution: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("healhub_token")) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, c, o] = await Promise.all([
        getRecoveryTrends(),
        getComplications(),
        getOverview(),
      ]);
      setTrends(t.data);
      setComplications(c.data);
      setOverview(o.data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-80 bg-[#1E293B] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const statusData = overview?.status_distribution
    ? Object.entries(overview.status_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const statusColors: Record<string, string> = {
    green: "#22C55E",
    yellow: "#EAB308",
    red: "#EF4444",
    critical: "#EF4444",
  };

  // Mock monthly data for area chart
  const monthlyData = [
    { month: "Oct", patients: 12 },
    { month: "Nov", patients: 18 },
    { month: "Dec", patients: 24 },
    { month: "Jan", patients: 20 },
    { month: "Feb", patients: 28 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery by surgery type */}
        <Card className="bg-[#1E293B] border-[#334155] p-6">
          <h3 className="text-sm font-semibold text-[#94A3B8] mb-4">Recovery Score by Surgery Type</h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="surgery_type" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avg_recovery_score" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Avg Recovery %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#64748B] text-center py-12">No data yet</p>
          )}
        </Card>

        {/* Patient status distribution */}
        <Card className="bg-[#1E293B] border-[#334155] p-6">
          <h3 className="text-sm font-semibold text-[#94A3B8] mb-4">Patient Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={statusColors[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#64748B] text-center py-12">No data yet</p>
          )}
        </Card>

        {/* Top symptoms */}
        <Card className="bg-[#1E293B] border-[#334155] p-6">
          <h3 className="text-sm font-semibold text-[#94A3B8] mb-4">Top Symptoms Detected</h3>
          {complications.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={complications} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748B" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="symptom" stroke="#64748B" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 6, 6, 0]} name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#64748B] text-center py-12">No complications detected</p>
          )}
        </Card>

        {/* Monthly volume */}
        <Card className="bg-[#1E293B] border-[#334155] p-6">
          <h3 className="text-sm font-semibold text-[#94A3B8] mb-4">Monthly Patient Volume</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748B" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="patients" stroke="#3B82F6" strokeWidth={2} fill="url(#colorPatients)" name="Patients" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </motion.div>
  );
}
