"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getRecoveryTrends, getComplications, getOverview } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Users,
  AlertTriangle,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Heart,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend,
} from "recharts";

const COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

/* ---------- Custom Glass Tooltip ---------- */
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {label && <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color }} />
          <span style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 500 }}>
            {entry.name}: {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ---------- Center Label for Donut ---------- */
const DonutCenterLabel = ({ viewBox, total }: any) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} y={cy - 8} style={{ fontSize: 28, fontWeight: 700, fill: "#F8FAFC" }}>
        {total}
      </tspan>
      <tspan x={cx} y={cy + 16} style={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}>
        PATIENTS
      </tspan>
    </text>
  );
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)" }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  const statusData = overview?.status_distribution
    ? Object.entries(overview.status_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const statusColors: Record<string, string> = {
    green: "#22C55E",
    yellow: "#F59E0B",
    red: "#EF4444",
    critical: "#EF4444",
  };

  const totalPatients = statusData.reduce((acc, d) => acc + d.value, 0);
  const totalComplications = complications.reduce((acc, d) => acc + d.count, 0);
  const avgRecovery =
    trends.length > 0
      ? Math.round(trends.reduce((acc, t) => acc + t.avg_recovery_score, 0) / trends.length)
      : 0;
  const totalSurgeries = trends.length;

  // Mock monthly data for area chart
  const monthlyData = [
    { month: "Oct", patients: 12 },
    { month: "Nov", patients: 18 },
    { month: "Dec", patients: 24 },
    { month: "Jan", patients: 20 },
    { month: "Feb", patients: 28 },
  ];

  /* ---------- KPI Cards Config ---------- */
  const kpiCards = [
    {
      label: "Total Patients",
      value: totalPatients,
      icon: Users,
      gradient: "from-blue-500/15 to-blue-600/5",
      borderColor: "rgba(59,130,246,0.2)",
      iconBg: "rgba(59,130,246,0.15)",
      iconColor: "#3B82F6",
      change: "+12%",
      changePositive: true,
    },
    {
      label: "Avg Recovery",
      value: `${avgRecovery}%`,
      icon: Heart,
      gradient: "from-emerald-500/15 to-emerald-600/5",
      borderColor: "rgba(34,197,94,0.2)",
      iconBg: "rgba(34,197,94,0.15)",
      iconColor: "#22C55E",
      change: "+5%",
      changePositive: true,
    },
    {
      label: "Surgery Types",
      value: totalSurgeries,
      icon: Activity,
      gradient: "from-purple-500/15 to-purple-600/5",
      borderColor: "rgba(139,92,246,0.2)",
      iconBg: "rgba(139,92,246,0.15)",
      iconColor: "#8B5CF6",
      change: "Active",
      changePositive: true,
    },
    {
      label: "Complications",
      value: totalComplications,
      icon: AlertTriangle,
      gradient: "from-amber-500/15 to-amber-600/5",
      borderColor: "rgba(245,158,11,0.2)",
      iconBg: "rgba(245,158,11,0.15)",
      iconColor: "#F59E0B",
      change: totalComplications > 0 ? "Needs attention" : "None",
      changePositive: totalComplications === 0,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
          Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Insights and trends across your patient population
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div
              className={`relative p-5 rounded-2xl bg-gradient-to-br ${kpi.gradient} overflow-hidden group hover:translate-y-[-2px] transition-transform duration-300`}
              style={{
                border: `1px solid ${kpi.borderColor}`,
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-white">{kpi.value}</p>
                  <p
                    className="text-xs mt-1.5 font-medium"
                    style={{ color: kpi.changePositive ? "#4ADE80" : "#FBBF24" }}
                  >
                    {kpi.change}
                  </p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: kpi.iconBg }}
                >
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery by Surgery Type - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="rounded-2xl p-6 h-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-blue-500/15">
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Recovery Score by Surgery</h3>
                <p className="text-xs text-slate-600 mt-0.5">Average recovery percentage per type</p>
              </div>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trends} barCategoryGap="25%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="surgery_type"
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar
                    dataKey="avg_recovery_score"
                    fill="url(#barGradient)"
                    radius={[8, 8, 4, 4]}
                    name="Avg Recovery %"
                    animationDuration={1200}
                    animationBegin={200}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-slate-600 text-sm">No data yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Patient Status Distribution - Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div
            className="rounded-2xl p-6 h-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-emerald-500/15">
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Patient Status Distribution</h3>
                <p className="text-xs text-slate-600 mt-0.5">Current health status breakdown</p>
              </div>
            </div>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {statusData.map((entry, index) => {
                      const c = statusColors[entry.name] || COLORS[index % COLORS.length];
                      return (
                        <linearGradient key={`pieGrad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity={1} />
                          <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                    cornerRadius={6}
                    animationDuration={1200}
                    animationBegin={200}
                    stroke="none"
                    label={(props: any) =>
                      `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={`url(#pieGrad-${index})`}
                        style={{
                          filter: `drop-shadow(0 0 6px ${statusColors[entry.name] || COLORS[index % COLORS.length]}40)`,
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span style={{ color: "#94A3B8", fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-slate-600 text-sm">No data yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Symptoms - Horizontal Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div
            className="rounded-2xl p-6 h-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-pink-500/15">
                <AlertTriangle className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Top Symptoms Detected</h3>
                <p className="text-xs text-slate-600 mt-0.5">Most frequently reported complications</p>
              </div>
            </div>
            {complications.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={complications} layout="vertical" barCategoryGap="20%">
                  <defs>
                    <linearGradient id="symptomBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={1} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="symptom"
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    width={110}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="url(#symptomBarGrad)"
                    radius={[0, 8, 8, 0]}
                    name="Occurrences"
                    animationDuration={1200}
                    animationBegin={400}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-slate-600 text-sm">No complications detected</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Monthly Patient Volume - Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div
            className="rounded-2xl p-6 h-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-purple-500/15">
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Monthly Patient Volume</h3>
                <p className="text-xs text-slate-600 mt-0.5">Enrollment trend over recent months</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#475569"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="url(#areaStroke)"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                  name="Patients"
                  animationDuration={1500}
                  animationBegin={300}
                  dot={{
                    r: 4,
                    fill: "#8B5CF6",
                    stroke: "#0F172A",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#8B5CF6",
                    stroke: "rgba(139,92,246,0.3)",
                    strokeWidth: 8,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
