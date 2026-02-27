"use client";

import { motion } from "framer-motion";
import { Users, AlertTriangle, Activity, CalendarCheck, TrendingUp, TrendingDown } from "lucide-react";
import { useCounter } from "@/hooks/use-counter";
import { staggerContainer, staggerItem } from "@/components/shared/PageWrapper";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  accentClass: string;
  decimals?: number;
}

function StatCard({ label, value, suffix, trend, trendUp, icon: Icon, iconColor, iconBg, accentClass, decimals = 0 }: StatCardProps) {
  const displayValue = useCounter(value, 1500, decimals);

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{
        y: -3,
        boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      className={`bg-card border border-border rounded-xl p-5 cursor-default card-glow ${accentClass}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <motion.p
            key={displayValue}
            className="text-[28px] font-semibold text-foreground mt-1 leading-tight"
          >
            {displayValue}{suffix}
          </motion.p>
          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className={`flex items-center gap-1 mt-1.5`}
            >
              {trendUp ? (
                <TrendingUp className="w-3 h-3 text-status-green" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <p className={`text-xs font-medium ${trendUp ? "text-status-green" : "text-destructive"}`}>
                {trend}
              </p>
            </motion.div>
          )}
        </div>
        <motion.div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
          whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
          transition={{ duration: 0.4 }}
        >
          {/* @ts-expect-error - Icon typing conflict from lucide-react */}
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface StatsOverviewProps {
  stats: {
    total_patients: number;
    active_alerts: number;
    avg_recovery_score: number;
    checkins_today: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <StatCard
        label="Total Patients"
        value={stats.total_patients}
        trend={`${stats.total_patients > 0 ? "+" : ""}${Math.floor(stats.total_patients * 0.12)} this month`}
        trendUp
        icon={Users}
        iconColor="text-heal-600"
        iconBg="bg-heal-50 dark:bg-heal-900/30"
        accentClass="stat-accent-blue"
      />
      <StatCard
        label="Active Alerts"
        value={stats.active_alerts}
        trend={stats.active_alerts > 0 ? `${stats.active_alerts} need attention` : "All clear"}
        trendUp={stats.active_alerts === 0}
        icon={AlertTriangle}
        iconColor="text-status-yellow"
        iconBg="bg-amber-50 dark:bg-amber-900/20"
        accentClass="stat-accent-yellow"
      />
      <StatCard
        label="Recovery Score"
        value={stats.avg_recovery_score}
        suffix="%"
        trend="+3% from last week"
        trendUp
        icon={Activity}
        iconColor="text-status-green"
        iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        accentClass="stat-accent-green"
      />
      <StatCard
        label="Check-ins Today"
        value={stats.checkins_today}
        trend="Across all patients"
        trendUp
        icon={CalendarCheck}
        iconColor="text-violet-600"
        iconBg="bg-violet-50 dark:bg-violet-900/20"
        accentClass="stat-accent-purple"
      />
    </motion.div>
  );
}
